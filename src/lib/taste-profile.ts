import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/db";
import { AI_MODEL } from "@/lib/ai-model";
import { normalizeToScale } from "@/lib/rating";
import { resolveMovieTmdbId } from "@/lib/resolve-movie";

/**
 * AI profil vkusu: Claude na pozadí shrne vkus a navrhne konkrétní filmy,
 * které model vah z čísel nenajde. Přepočítává se po dávce rozhodnutí,
 * nikdy v request path fronty ani swipe.
 */

/** Po kolika nových rozhodnutích se profil přepočítá. */
export const PROFILE_REFRESH_EVERY = 20;
/** Minimum rozhodnutí pro první profil (dřív by byl jen šum). */
const PROFILE_MIN_DECISIONS = 10;
const PICK_COUNT = 10;

export type ProfilePick = { title: string; year: number; reason: string; tmdbId: number };

export type StoredTasteProfile = {
  summary: string;
  picks: ProfilePick[];
  decisionCount: number;
  updatedAt: Date;
};

const ProfileSchema = z.object({
  summary: z
    .string()
    .describe("2–4 věty česky: co uživatele baví, co ho nebaví, jaké tempo a styl má rád"),
  picks: z.array(
    z.object({
      title: z.string().describe("Původní nebo mezinárodní název filmu"),
      year: z.number().int(),
      reason: z.string().describe("Jedna krátká věta česky, proč se mu bude líbit, s odkazem na jeho vkus"),
    }),
  ),
});

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** Běžící přepočty na této instanci serveru (aby dva swipy nespustily dva). */
const inFlight = new Set<string>();

const DECISION_STATUSES = ["WATCHED", "WANT", "NOT_INTERESTED"] as const;

export async function getTasteProfile(userId: string): Promise<StoredTasteProfile | null> {
  const row = await prisma.tasteProfile.findUnique({
    where: { userId_media: { userId, media: "movie" } },
  });
  if (!row) return null;
  let picks: ProfilePick[] = [];
  try {
    picks = JSON.parse(row.picks) as ProfilePick[];
  } catch {
    // Poškozený JSON: profil bez tipů je pořád užitečný pro chat.
  }
  return { summary: row.summary, picks, decisionCount: row.decisionCount, updatedAt: row.updatedAt };
}

/** Přepočítá profil, pokud od posledního přibylo aspoň PROFILE_REFRESH_EVERY rozhodnutí. */
export async function refreshTasteProfileIfDue(userId: string): Promise<boolean> {
  if (!client || inFlight.has(userId)) return false;

  const [count, existing] = await Promise.all([
    prisma.userMovie.count({ where: { userId, status: { in: [...DECISION_STATUSES] } } }),
    prisma.tasteProfile.findUnique({
      where: { userId_media: { userId, media: "movie" } },
      select: { decisionCount: true },
    }),
  ]);
  const due = existing
    ? count - existing.decisionCount >= PROFILE_REFRESH_EVERY
    : count >= PROFILE_MIN_DECISIONS;
  if (!due) return false;

  inFlight.add(userId);
  try {
    await computeTasteProfile(userId, count);
    return true;
  } catch (err) {
    console.error("[taste-profile]", err);
    return false;
  } finally {
    inFlight.delete(userId);
  }
}

export async function computeTasteProfile(userId: string, decisionCount: number) {
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  const [rows, people] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId },
      select: { tmdbId: true, status: true, rating: true, ratingType: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.favoritePerson.findMany({ where: { userId }, select: { name: true, department: true } }),
  ]);
  const decided = rows.filter((r) => (DECISION_STATUSES as readonly string[]).includes(r.status));

  const titles = await prisma.$queryRaw<Array<{ tmdbId: number; title: string | null; year: string | null }>>`
    SELECT "tmdbId", data::jsonb ->> 'title' AS title, LEFT(data::jsonb ->> 'release_date', 4) AS year
    FROM "MovieCache" WHERE "tmdbId" = ANY(${decided.map((d) => d.tmdbId)}::int[])`;
  const label = new Map(
    titles.filter((t) => t.title).map((t) => [t.tmdbId, t.year ? `${t.title} (${t.year})` : t.title!]),
  );

  const watched = decided
    .filter((d) => d.status === "WATCHED" && label.has(d.tmdbId))
    .map((d) => {
      const scale = d.rating != null ? normalizeToScale(d.rating, d.ratingType) : null;
      return { name: label.get(d.tmdbId)!, scale };
    })
    .sort((a, b) => (b.scale ?? 5) - (a.scale ?? 5));
  const listOf = (status: string) =>
    decided.filter((d) => d.status === status && label.has(d.tmdbId)).map((d) => label.get(d.tmdbId)!);

  const prompt = `Viděl a ohodnotil (0–10):
${watched.map((w) => `- ${w.name}${w.scale != null ? `: ${w.scale}/10` : ""}`).join("\n") || "- nic"}

Chce vidět:
${listOf("WANT").map((t) => `- ${t}`).join("\n") || "- nic"}

Nezajímá ho:
${listOf("NOT_INTERESTED").map((t) => `- ${t}`).join("\n") || "- nic"}

Oblíbení tvůrci (herci, režiséři, scenáristé, skladatelé):
${people.map((p) => `- ${p.name} (${p.department})`).join("\n") || "- nikdo"}

Napiš profil jeho filmového vkusu a navrhni ${PICK_COUNT} konkrétních filmů, které ještě nezná.
Žádný z navržených filmů nesmí být v seznamech výše. Upřednostni méně známé tituly, které by
sám nenašel, před největšími hity; aspoň dva ať jsou mimo jeho obvyklé žánry, ale pořád v jeho stylu.`;

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 4000,
    system:
      "Jsi filmový kurátor v aplikaci Media Diary. Z historie rozhodnutí uživatele odvoď jeho vkus. Nízké hodnocení a „nezajímá ho“ jsou stejně důležité jako vysoké hodnocení.",
    output_config: { effort: "medium", format: zodOutputFormat(ProfileSchema) },
    messages: [{ role: "user", content: prompt }],
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`taste profile not parsed (stop_reason: ${response.stop_reason})`);

  // Tipy dohledat v TMDB a vyřadit vše, co už uživatel v nabídce měl.
  const known = new Set(rows.map((r) => r.tmdbId));
  const resolved = await Promise.all(
    parsed.picks.map(async (p) => {
      const tmdbId = await resolveMovieTmdbId(p.title, p.year).catch(() => null);
      return tmdbId && !known.has(tmdbId) ? { ...p, tmdbId } : null;
    }),
  );
  const picks = resolved.filter((p): p is ProfilePick => p !== null);

  await prisma.tasteProfile.upsert({
    where: { userId_media: { userId, media: "movie" } },
    create: { userId, media: "movie", summary: parsed.summary, picks: JSON.stringify(picks), decisionCount },
    update: { summary: parsed.summary, picks: JSON.stringify(picks), decisionCount },
  });

  return { summary: parsed.summary, picks };
}
