import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type UserTasteProfile = {
  locale: "cs" | "en";
  watched: Array<{ title: string; rating?: number | null; genres: string[] }>;
  wantList: string[];
  favoriteGenres: string[];
  skippedCount: number;
};

export async function getRecommendations(
  profile: UserTasteProfile,
  count = 5,
): Promise<string> {
  if (!client) {
    return profile.locale === "cs"
      ? "AI doporučení vyžaduje ANTHROPIC_API_KEY v .env souboru."
      : "AI recommendations require ANTHROPIC_API_KEY in .env.";
  }

  const prompt =
    profile.locale === "cs"
      ? `Jsi filmový kurátor. Na základě profilu uživatele doporuč ${count} filmů, které ještě nemá v seznamu "chci vidět" ani "viděl".

Profil:
- Oblíbené žánry: ${profile.favoriteGenres.join(", ") || "neuvedeno"}
- Nedávno hodnocené filmy: ${profile.watched.map((w) => `${w.title}${w.rating ? ` (${w.rating})` : ""}`).join(", ") || "žádné"}
- Wishlist: ${profile.wantList.join(", ") || "prázdný"}

Pro každý film uveď: název (rok), proč by se líbil (1 věta), hlavní žánr.
Formát: odrážkový seznam.`
      : `You are a film curator. Based on the user profile, recommend ${count} movies not already in their watched or want lists.

Profile:
- Favorite genres: ${profile.favoriteGenres.join(", ") || "none"}
- Recently rated: ${profile.watched.map((w) => `${w.title}${w.rating ? ` (${w.rating})` : ""}`).join(", ") || "none"}
- Wishlist: ${profile.wantList.join(", ") || "empty"}

For each: title (year), one-line reason, main genre.
Format: bullet list.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

export async function chatAboutMovies(
  message: string,
  profile: UserTasteProfile,
): Promise<string> {
  if (!client) {
    return profile.locale === "cs"
      ? "Nastavte ANTHROPIC_API_KEY pro AI chat."
      : "Set ANTHROPIC_API_KEY for AI chat.";
  }

  const system =
    profile.locale === "cs"
      ? `Jsi osobní filmový asistent. Uživatel sleduje filmy v aplikaci Media Diary.
Oblíbené žánry: ${profile.favoriteGenres.join(", ")}
Viděl: ${profile.watched.slice(0, 15).map((w) => w.title).join(", ")}
Chce vidět: ${profile.wantList.slice(0, 10).join(", ")}
Odpovídej stručně v češtině. Doporuč konkrétní filmy s rokem.`
      : `You are a personal movie assistant for Media Diary app.
Favorite genres: ${profile.favoriteGenres.join(", ")}
Watched: ${profile.watched.slice(0, 15).map((w) => w.title).join(", ")}
Want to watch: ${profile.wantList.slice(0, 10).join(", ")}
Reply concisely in English. Recommend specific movies with year.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: message }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export async function explainPersonFilms(
  personName: string,
  role: string,
  unwatchedTitles: string[],
  locale: "cs" | "en",
): Promise<string> {
  if (!client) return "";

  const prompt =
    locale === "cs"
      ? `${personName} (${role}) — které z těchto filmů bys doporučil jako první a proč?\n${unwatchedTitles.join("\n")}\nMax 3 tipy, stručně.`
      : `${personName} (${role}) — which of these films would you recommend first and why?\n${unwatchedTitles.join("\n")}\nMax 3 picks, brief.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
