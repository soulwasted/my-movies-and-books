import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_MODEL, AI_EFFORT, buildMessages, type AiChatTurn } from "@/lib/ai-model";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type UserTasteProfile = {
  locale: "cs" | "en";
  watched: Array<{ title: string; rating?: number | null; genres: string[] }>;
  wantList: string[];
  /** Tituly označené „nechci vidět/číst“: negativní signál vkusu. */
  notInterested: string[];
  /** Shrnutí vkusu z AI profilu počítaného na pozadí (pokud už existuje). */
  tasteSummary?: string;
  /** Oblíbení tvůrci, např. „Denis Villeneuve (režie)“. */
  favoritePeople?: string[];
  excludedTitles: Array<{ title: string; year: number }>;
  excludedTmdbIds: number[];
  favoriteGenres: string[];
  skippedCount: number;
};

export type AiMovieRecommendation = {
  title: string;
  /** Originální nebo anglický název pro dohledání v TMDB (title bývá česky). */
  originalTitle?: string;
  year: number;
  genre: string;
  reason: string;
  author?: string;
  /** Vyřešeno na serveru při filtrování, klient pak nemusí znovu hledat. */
  tmdbId?: number;
  volumeId?: string;
};

export type AiStructuredResponse = {
  summary: string;
  recommendations: AiMovieRecommendation[];
  followUp: string;
};

/** Schéma odpovědi pro structured outputs (nový model nepodporuje vynucený tool_choice). */
const ResponseSchema = z.object({
  summary: z.string().describe("Brief intro or answer to the user (1-3 sentences)"),
  recommendations: z.array(
    z.object({
      title: z.string(),
      originalTitle: z
        .string()
        .describe("Original title, or the English international title for non-Latin originals; used for database lookup"),
      year: z.number().int(),
      genre: z.string(),
      reason: z.string().describe("One sentence why it fits"),
    }),
  ),
  followUp: z.string().describe("Optional closing question or tip, may be empty"),
});


function notConfigured(locale: "cs" | "en"): AiStructuredResponse {
  return {
    summary:
      locale === "cs"
        ? "AI vyžaduje ANTHROPIC_API_KEY v nastavení serveru."
        : "AI requires ANTHROPIC_API_KEY on the server.",
    recommendations: [],
    followUp: "",
  };
}

function profileBlock(profile: UserTasteProfile): string {
  const excludedList =
    profile.excludedTitles
      // Celý seznam: když se ořízl, AI doporučovala viděné filmy a filtr z 9 nechal 2.
      .slice(0, 400)
      .map((m) => `${m.title} (${m.year})`)
      .join(", ") || (profile.locale === "cs" ? "žádné" : "none");

  const summary = profile.tasteSummary
    ? profile.locale === "cs"
      ? `Profil vkusu (z celé historie): ${profile.tasteSummary}\n`
      : `Taste profile (from full history): ${profile.tasteSummary}\n`
    : "";

  return summary + (profile.locale === "cs"
    ? `Oblíbené žánry: ${profile.favoriteGenres.join(", ") || "neuvedeno"}
Oblíbení tvůrci: ${profile.favoritePeople?.join(", ") || "neuvedeno"}
Viděl (nedávno): ${profile.watched.slice(0, 15).map((w) => w.title).join(", ") || "nic"}
Chce vidět: ${profile.wantList.slice(0, 15).join(", ") || "prázdný"}
Nezajímá ho (vyhýbej se podobným): ${profile.notInterested.slice(0, 15).join(", ") || "nic"}

ZAKÁZANÉ tituly — už viděl nebo chce vidět, NIKDY je nedoporučuj:
${excludedList}`
    : `Favorite genres: ${profile.favoriteGenres.join(", ") || "none"}
Favorite people: ${profile.favoritePeople?.join(", ") || "none"}
Recently watched: ${profile.watched.slice(0, 15).map((w) => w.title).join(", ") || "none"}
Want to watch: ${profile.wantList.slice(0, 15).join(", ") || "empty"}
Not interested (avoid similar): ${profile.notInterested.slice(0, 15).join(", ") || "none"}

FORBIDDEN titles — already watched or on wishlist, NEVER recommend:
${excludedList}`);
}

async function callStructured(
  system: string,
  userMessage: string,
  history: AiChatTurn[] = [],
): Promise<AiStructuredResponse> {
  const response = await client!.messages.parse({
    model: AI_MODEL,
    max_tokens: 4000,
    system,
    output_config: { effort: AI_EFFORT, format: zodOutputFormat(ResponseSchema) },
    messages: buildMessages(history, userMessage),
  });

  if (response.parsed_output) return response.parsed_output;

  // Odmítnutí nebo neparsovatelná odpověď: vrátit aspoň text, ať UI něco ukáže.
  const textBlock = response.content.find((b) => b.type === "text");
  return {
    summary: textBlock?.type === "text" ? textBlock.text : "",
    recommendations: [],
    followUp: "",
  };
}

export async function getRecommendations(
  profile: UserTasteProfile,
  count = 5,
): Promise<AiStructuredResponse> {
  if (!client) return notConfigured(profile.locale);

  const system =
    profile.locale === "cs"
      ? `Jsi filmový kurátor v aplikaci Media Diary.
Doporučuj konkrétní existující filmy s rokem.
Striktně vynech filmy ze seznamu ZAKÁZANÉ tituly — uživatel je už viděl nebo má v seznamu chci vidět.
V summary neuváděj počet filmů, část se jich ještě odfiltruje.`
      : `You are a film curator for Media Diary.
Recommend specific, real movies with year.
Strictly exclude FORBIDDEN titles — already watched or on wishlist.
Do not state how many movies you recommend in the summary; some get filtered out.`;

  const prompt =
    profile.locale === "cs"
      ? `Doporuč ${count + 4} filmů podle tohoto profilu (rezerva pro filtrování):\n${profileBlock(profile)}`
      : `Recommend ${count + 4} movies for this profile (buffer for filtering):\n${profileBlock(profile)}`;

  return callStructured(system, prompt);
}

export async function chatAboutMovies(
  message: string,
  profile: UserTasteProfile,
  history: AiChatTurn[] = [],
  /** Kolik filmů uživatel uvidí; AI navrhne o pár víc, část odfiltrují viděné. */
  count = 3,
): Promise<AiStructuredResponse> {
  if (!client) return notConfigured(profile.locale);

  const system =
    profile.locale === "cs"
      ? `Jsi osobní filmový asistent v aplikaci Media Diary.
Profil uživatele:
${profileBlock(profile)}
Odpovídej v češtině. Pokud uživatel nechce doporučení, nech recommendations prázdné a odpověz v summary.
Když doporučuješ, navrhni ${count + 3} filmů (uživatel uvidí ${count}, zbytek je rezerva pro filtrování) a v summary neuváděj jejich počet.
Nikdy nedoporučuj filmy ze seznamu ZAKÁZANÉ tituly.`
      : `You are a personal movie assistant for Media Diary.
User profile:
${profileBlock(profile)}
Reply in English. If the user doesn't want picks, leave recommendations empty and answer in summary.
When recommending, suggest ${count + 3} movies (the user sees ${count}, the rest is a buffer for filtering) and do not state the count in the summary.
Never recommend movies from the FORBIDDEN titles list.`;

  return callStructured(system, message, history);
}

export async function explainPersonFilms(
  personName: string,
  role: string,
  unwatchedTitles: string[],
  locale: "cs" | "en",
): Promise<AiStructuredResponse> {
  if (!client) {
    return { summary: "", recommendations: [], followUp: "" };
  }

  const prompt =
    locale === "cs"
      ? `${personName} (${role}) — které z těchto filmů doporučit jako první?\n${unwatchedTitles.join("\n")}\nMax 3 tipy.`
      : `${personName} (${role}) — which of these films to recommend first?\n${unwatchedTitles.join("\n")}\nMax 3 picks.`;

  const system =
    locale === "cs"
      ? "Max 3 doporučení."
      : "Max 3 recommendations.";

  return callStructured(system, prompt);
}

export function formatAiResponseText(data: AiStructuredResponse): string {
  const parts: string[] = [];
  if (data.summary) parts.push(data.summary);
  for (const rec of data.recommendations) {
    parts.push(`• ${rec.title} (${rec.year}) — ${rec.genre}\n  ${rec.reason}`);
  }
  if (data.followUp) parts.push(data.followUp);
  return parts.join("\n\n");
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
