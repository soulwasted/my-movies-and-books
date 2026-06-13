import Anthropic from "@anthropic-ai/sdk";
import type { AiStructuredResponse } from "@/lib/ai";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type UserBookTasteProfile = {
  locale: "cs" | "en";
  read: Array<{ title: string; author: string; rating?: number | null; categories: string[] }>;
  wantList: string[];
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
};

export type AiBookStructuredResponse = {
  summary: string;
  recommendations: AiBookRecommendation[];
  followUp: string;
};

const BOOK_RESPONSE_TOOL: Anthropic.Tool = {
  name: "book_assistant_response",
  description: "Structured book assistant response with recommendations",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description: "Brief intro or answer to the user (1-3 sentences)",
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            year: { type: "integer" },
            genre: { type: "string" },
            reason: { type: "string", description: "One sentence why it fits" },
          },
          required: ["title", "author", "year", "genre", "reason"],
        },
      },
      followUp: {
        type: "string",
        description: "Optional closing question or tip",
      },
    },
    required: ["summary", "recommendations", "followUp"],
  },
};

function parseBookToolResponse(input: unknown): AiBookStructuredResponse {
  const data = input as Partial<AiBookStructuredResponse>;
  return {
    summary: typeof data.summary === "string" ? data.summary : "",
    recommendations: Array.isArray(data.recommendations)
      ? data.recommendations.filter(
          (r): r is AiBookRecommendation =>
            typeof r?.title === "string" &&
            typeof r?.author === "string" &&
            typeof r?.year === "number" &&
            typeof r?.genre === "string" &&
            typeof r?.reason === "string",
        )
      : [],
    followUp: typeof data.followUp === "string" ? data.followUp : "",
  };
}

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
      .slice(0, 80)
      .map((b) => `${b.title} — ${b.author} (${b.year})`)
      .join(", ") || (profile.locale === "cs" ? "žádné" : "none");

  return profile.locale === "cs"
    ? `Oblíbené kategorie: ${profile.favoriteCategories.join(", ") || "neuvedeno"}
Přečteno (nedávno): ${profile.read.slice(0, 15).map((b) => `${b.title} (${b.author})`).join(", ") || "nic"}
Chci číst: ${profile.wantList.slice(0, 15).join(", ") || "prázdný"}

ZAKÁZANÉ tituly — už přečteno nebo v seznamu chci číst, NIKDY je nedoporučuj:
${excludedList}`
    : `Favorite categories: ${profile.favoriteCategories.join(", ") || "none"}
Recently read: ${profile.read.slice(0, 15).map((b) => `${b.title} (${b.author})`).join(", ") || "none"}
Want to read: ${profile.wantList.slice(0, 15).join(", ") || "empty"}

FORBIDDEN titles — already read or on wishlist, NEVER recommend:
${excludedList}`;
}

async function callBookStructured(
  system: string,
  userMessage: string,
): Promise<AiBookStructuredResponse> {
  const response = await client!.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system,
    tools: [BOOK_RESPONSE_TOOL],
    tool_choice: { type: "tool", name: "book_assistant_response" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (toolBlock?.type === "tool_use") {
    return parseBookToolResponse(toolBlock.input);
  }

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
      ? `Jsi knižní kurátor v aplikaci Media Diary. Vždy odpovídej přes nástroj book_assistant_response.
Doporučuj konkrétní knihy s autorem a rokem. Striktně vynech knihy ze seznamu ZAKÁZANÉ tituly.`
      : `You are a book curator for Media Diary. Always respond via book_assistant_response tool.
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
): Promise<AiBookStructuredResponse> {
  if (!client) return notConfigured(profile.locale);

  const system =
    profile.locale === "cs"
      ? `Jsi osobní knižní asistent v aplikaci Media Diary. Vždy odpovídej přes nástroj book_assistant_response.
Profil uživatele:
${profileBlock(profile)}
Odpovídej v češtině. Pokud uživatel nechce doporučení, nech recommendations prázdné a odpověz v summary.
Nikdy nedoporučuj knihy ze seznamu ZAKÁZANÉ tituly.`
      : `You are a personal book assistant for Media Diary. Always respond via book_assistant_response tool.
User profile:
${profileBlock(profile)}
Reply in English. If the user doesn't want picks, leave recommendations empty and answer in summary.
Never recommend books from the FORBIDDEN titles list.`;

  return callBookStructured(system, message);
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
      ? "Odpovídej přes book_assistant_response. Max 3 doporučení."
      : "Respond via book_assistant_response. Max 3 recommendations.";

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
    })) as AiStructuredResponse["recommendations"],
    followUp: data.followUp,
  };
}
