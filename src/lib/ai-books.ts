import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_MODEL, AI_EFFORT, buildMessages, type AiChatTurn } from "@/lib/ai-model";
import type { AiStructuredResponse } from "@/lib/ai";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type UserBookTasteProfile = {
  locale: "cs" | "en";
  read: Array<{ title: string; author: string; rating?: number | null; categories: string[] }>;
  wantList: string[];
  /** Tituly označené „nechci vidět/číst“: negativní signál vkusu. */
  notInterested: string[];
  excludedTitles: Array<{ title: string; author: string; year: number }>;
  excludedVolumeIds: string[];
  favoriteCategories: string[];
  skippedCount: number;
};

export type AiBookRecommendation = {
  title: string;
  author: string;
  year: number;
  genre: string;
  reason: string;
  volumeId?: string;
};

export type AiBookStructuredResponse = {
  summary: string;
  recommendations: AiBookRecommendation[];
  followUp: string;
};

/** Schéma odpovědi pro structured outputs (nový model nepodporuje vynucený tool_choice). */
const BookResponseSchema = z.object({
  summary: z.string().describe("Brief intro or answer to the user (1-3 sentences)"),
  recommendations: z.array(
    z.object({
      title: z.string(),
      author: z.string(),
      year: z.number().int(),
      genre: z.string(),
      reason: z.string().describe("One sentence why it fits"),
    }),
  ),
  followUp: z.string().describe("Optional closing question or tip, may be empty"),
});


function notConfigured(locale: "cs" | "en"): AiBookStructuredResponse {
  return {
    summary:
      locale === "cs"
        ? "AI vyžaduje ANTHROPIC_API_KEY v nastavení serveru."
        : "AI requires ANTHROPIC_API_KEY on the server.",
    recommendations: [],
    followUp: "",
  };
}

function profileBlock(profile: UserBookTasteProfile): string {
  const excludedList =
    profile.excludedTitles
      .slice(0, 400)
      .map((b) => `${b.title} — ${b.author} (${b.year})`)
      .join(", ") || (profile.locale === "cs" ? "žádné" : "none");

  return profile.locale === "cs"
    ? `Oblíbené kategorie: ${profile.favoriteCategories.join(", ") || "neuvedeno"}
Přečteno (nedávno): ${profile.read.slice(0, 15).map((b) => `${b.title} (${b.author})`).join(", ") || "nic"}
Chci číst: ${profile.wantList.slice(0, 15).join(", ") || "prázdný"}
Nezajímá ho (vyhýbej se podobným): ${profile.notInterested.slice(0, 15).join(", ") || "nic"}

ZAKÁZANÉ tituly — už přečteno nebo v seznamu chci číst, NIKDY je nedoporučuj:
${excludedList}`
    : `Favorite categories: ${profile.favoriteCategories.join(", ") || "none"}
Recently read: ${profile.read.slice(0, 15).map((b) => `${b.title} (${b.author})`).join(", ") || "none"}
Want to read: ${profile.wantList.slice(0, 15).join(", ") || "empty"}
Not interested (avoid similar): ${profile.notInterested.slice(0, 15).join(", ") || "none"}

FORBIDDEN titles — already read or on wishlist, NEVER recommend:
${excludedList}`;
}

async function callBookStructured(
  system: string,
  userMessage: string,
  history: AiChatTurn[] = [],
): Promise<AiBookStructuredResponse> {
  const response = await client!.messages.parse({
    model: AI_MODEL,
    max_tokens: 4000,
    system,
    output_config: { effort: AI_EFFORT, format: zodOutputFormat(BookResponseSchema) },
    messages: buildMessages(history, userMessage),
  });

  if (response.parsed_output) return response.parsed_output;

  const textBlock = response.content.find((b) => b.type === "text");
  return {
    summary: textBlock?.type === "text" ? textBlock.text : "",
    recommendations: [],
    followUp: "",
  };
}

export async function getBookRecommendations(
  profile: UserBookTasteProfile,
  count = 5,
): Promise<AiBookStructuredResponse> {
  if (!client) return notConfigured(profile.locale);

  const system =
    profile.locale === "cs"
      ? `Jsi knižní kurátor v aplikaci Media Diary.
Doporučuj konkrétní knihy s autorem a rokem. Striktně vynech knihy ze seznamu ZAKÁZANÉ tituly.`
      : `You are a book curator for Media Diary.
Recommend specific books with author and year. Strictly exclude FORBIDDEN titles.`;

  const prompt =
    profile.locale === "cs"
      ? `Doporuč ${count + 4} knih podle tohoto profilu (rezerva pro filtrování):\n${profileBlock(profile)}`
      : `Recommend ${count + 4} books for this profile (buffer for filtering):\n${profileBlock(profile)}`;

  return callBookStructured(system, prompt);
}

export async function chatAboutBooks(
  message: string,
  profile: UserBookTasteProfile,
  history: AiChatTurn[] = [],
): Promise<AiBookStructuredResponse> {
  if (!client) return notConfigured(profile.locale);

  const system =
    profile.locale === "cs"
      ? `Jsi osobní knižní asistent v aplikaci Media Diary.
Profil uživatele:
${profileBlock(profile)}
Odpovídej v češtině. Pokud uživatel nechce doporučení, nech recommendations prázdné a odpověz v summary.
Nikdy nedoporučuj knihy ze seznamu ZAKÁZANÉ tituly.`
      : `You are a personal book assistant for Media Diary.
User profile:
${profileBlock(profile)}
Reply in English. If the user doesn't want picks, leave recommendations empty and answer in summary.
Never recommend books from the FORBIDDEN titles list.`;

  return callBookStructured(system, message, history);
}

export async function explainAuthorBooks(
  authorName: string,
  unreadTitles: string[],
  locale: "cs" | "en",
): Promise<AiBookStructuredResponse> {
  if (!client) {
    return { summary: "", recommendations: [], followUp: "" };
  }

  const prompt =
    locale === "cs"
      ? `${authorName} — které z těchto knih doporučit jako první?\n${unreadTitles.join("\n")}\nMax 3 tipy.`
      : `${authorName} — which of these books to recommend first?\n${unreadTitles.join("\n")}\nMax 3 picks.`;

  const system =
    locale === "cs"
      ? "Max 3 doporučení."
      : "Max 3 recommendations.";

  return callBookStructured(system, prompt);
}

export function formatBookAiResponseText(data: AiBookStructuredResponse): string {
  const parts: string[] = [];
  if (data.summary) parts.push(data.summary);
  for (const rec of data.recommendations) {
    parts.push(`• ${rec.title} — ${rec.author} (${rec.year}) — ${rec.genre}\n  ${rec.reason}`);
  }
  if (data.followUp) parts.push(data.followUp);
  return parts.join("\n\n");
}

/** Convert book AI response to generic AiStructuredResponse shape for shared UI */
export function bookResponseToGeneric(data: AiBookStructuredResponse): AiStructuredResponse {
  return {
    summary: data.summary,
    recommendations: data.recommendations.map((r) => ({
      title: r.title,
      year: r.year,
      genre: r.genre,
      reason: r.reason,
      author: r.author,
      volumeId: r.volumeId,
    })) as AiStructuredResponse["recommendations"],
    followUp: data.followUp,
  };
}
