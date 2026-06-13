import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type UserTasteProfile = {
  locale: "cs" | "en";
  watched: Array<{ title: string; rating?: number | null; genres: string[] }>;
  wantList: string[];
  excludedTitles: Array<{ title: string; year: number }>;
  excludedTmdbIds: number[];
  favoriteGenres: string[];
  skippedCount: number;
};

export type AiMovieRecommendation = {
  title: string;
  year: number;
  genre: string;
  reason: string;
  author?: string;
};

export type AiStructuredResponse = {
  summary: string;
  recommendations: AiMovieRecommendation[];
  followUp: string;
};

const RESPONSE_TOOL: Anthropic.Tool = {
  name: "movie_assistant_response",
  description: "Structured movie assistant response with recommendations",
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
            year: { type: "integer" },
            genre: { type: "string" },
            reason: { type: "string", description: "One sentence why it fits" },
          },
          required: ["title", "year", "genre", "reason"],
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

function parseToolResponse(input: unknown): AiStructuredResponse {
  const data = input as Partial<AiStructuredResponse>;
  return {
    summary: typeof data.summary === "string" ? data.summary : "",
    recommendations: Array.isArray(data.recommendations)
      ? data.recommendations.filter(
          (r): r is AiMovieRecommendation =>
            typeof r?.title === "string" &&
            typeof r?.year === "number" &&
            typeof r?.genre === "string" &&
            typeof r?.reason === "string",
        )
      : [],
    followUp: typeof data.followUp === "string" ? data.followUp : "",
  };
}

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
      .slice(0, 80)
      .map((m) => `${m.title} (${m.year})`)
      .join(", ") || (profile.locale === "cs" ? "žádné" : "none");

  return profile.locale === "cs"
    ? `Oblíbené žánry: ${profile.favoriteGenres.join(", ") || "neuvedeno"}
Viděl (nedávno): ${profile.watched.slice(0, 15).map((w) => w.title).join(", ") || "nic"}
Chce vidět: ${profile.wantList.slice(0, 15).join(", ") || "prázdný"}

ZAKÁZANÉ tituly — už viděl nebo chce vidět, NIKDY je nedoporučuj:
${excludedList}`
    : `Favorite genres: ${profile.favoriteGenres.join(", ") || "none"}
Recently watched: ${profile.watched.slice(0, 15).map((w) => w.title).join(", ") || "none"}
Want to watch: ${profile.wantList.slice(0, 15).join(", ") || "empty"}

FORBIDDEN titles — already watched or on wishlist, NEVER recommend:
${excludedList}`;
}

async function callStructured(
  system: string,
  userMessage: string,
): Promise<AiStructuredResponse> {
  const response = await client!.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system,
    tools: [RESPONSE_TOOL],
    tool_choice: { type: "tool", name: "movie_assistant_response" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (toolBlock?.type === "tool_use") {
    return parseToolResponse(toolBlock.input);
  }

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
      ? `Jsi filmový kurátor v aplikaci Media Diary. Vždy odpovídej přes nástroj movie_assistant_response.
Doporučuj konkrétní filmy s rokem. Striktně vynech filmy ze seznamu ZAKÁZANÉ tituly — uživatel je už viděl nebo má v seznamu chci vidět.`
      : `You are a film curator for Media Diary. Always respond via movie_assistant_response tool.
Recommend specific movies with year. Strictly exclude FORBIDDEN titles — already watched or on wishlist.`;

  const prompt =
    profile.locale === "cs"
      ? `Doporuč ${count + 4} filmů podle tohoto profilu (rezerva pro filtrování):\n${profileBlock(profile)}`
      : `Recommend ${count + 4} movies for this profile (buffer for filtering):\n${profileBlock(profile)}`;

  return callStructured(system, prompt);
}

export async function chatAboutMovies(
  message: string,
  profile: UserTasteProfile,
): Promise<AiStructuredResponse> {
  if (!client) return notConfigured(profile.locale);

  const system =
    profile.locale === "cs"
      ? `Jsi osobní filmový asistent v aplikaci Media Diary. Vždy odpovídej přes nástroj movie_assistant_response.
Profil uživatele:
${profileBlock(profile)}
Odpovídej v češtině. Pokud uživatel nechce doporučení, nech recommendations prázdné a odpověz v summary.
Nikdy nedoporučuj filmy ze seznamu ZAKÁZANÉ tituly.`
      : `You are a personal movie assistant for Media Diary. Always respond via movie_assistant_response tool.
User profile:
${profileBlock(profile)}
Reply in English. If the user doesn't want picks, leave recommendations empty and answer in summary.
Never recommend movies from the FORBIDDEN titles list.`;

  return callStructured(system, message);
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
      ? "Odpovídej přes movie_assistant_response. Max 3 doporučení."
      : "Respond via movie_assistant_response. Max 3 recommendations.";

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
