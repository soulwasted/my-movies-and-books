import { prisma } from "@/lib/db";
import { normalizeToScale } from "@/lib/rating";
import { buildTasteModel, type DecisionFeatures, type DecisionStatus } from "@/lib/taste-model";

/**
 * Podklady pro návrhy dotazů u AI chatu („Sci-fi filmy“, „Režie Nolan“…).
 * Deterministicky z modelu vkusu a oblíbených tvůrců, bez volání AI;
 * texty skládá stránka přes překlady.
 */

export type ChatSuggestion =
  | { kind: "genre"; id: number }
  | { kind: "dark" }
  | { kind: "decade"; decade: number }
  | { kind: "language"; code: string }
  | { kind: "person"; name: string; department: string }
  | { kind: "surprise" };

/** Žánry, pro které existuje překlad návrhu (TV film a podobné vynechané). */
export const SUGGESTION_GENRES = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37,
];
export const SUGGESTION_LANGUAGES = ["cs", "fr", "it", "es", "de", "ja", "ko", "zh", "sv", "da", "ru"];
const DARK_GENRES = [53, 80, 27];

function shuffle<T>(items: T[]): T[] {
  return items
    .map((item) => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

export async function getChatSuggestions(userId: string): Promise<ChatSuggestion[]> {
  const [rows, people] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId, status: { in: ["WATCHED", "WANT", "NOT_INTERESTED"] } },
      select: { tmdbId: true, status: true, rating: true, ratingType: true },
    }),
    prisma.favoritePerson.findMany({ where: { userId }, select: { name: true, department: true } }),
  ]);

  const features = rows.length
    ? await prisma.$queryRaw<
        Array<{ tmdbId: number; genres: Array<{ id: number }> | null; release_date: string | null; lang: string | null }>
      >`SELECT "tmdbId", data::jsonb -> 'genres' AS genres,
               data::jsonb ->> 'release_date' AS release_date, data::jsonb ->> 'original_language' AS lang
        FROM "MovieCache" WHERE "tmdbId" = ANY(${rows.map((r) => r.tmdbId)}::int[])`
    : [];
  const featureById = new Map(features.map((f) => [f.tmdbId, f]));

  const decisions: DecisionFeatures[] = rows.flatMap((r) => {
    const f = featureById.get(r.tmdbId);
    if (!f) return [];
    const year = parseInt(f.release_date?.slice(0, 4) ?? "", 10);
    return [
      {
        status: r.status as DecisionStatus,
        rating: r.rating != null ? normalizeToScale(r.rating, r.ratingType) : null,
        genreIds: (f.genres ?? []).map((g) => g.id),
        year: Number.isFinite(year) ? year : null,
        language: f.lang,
      },
    ];
  });
  const model = buildTasteModel(decisions);

  const top = <K,>(weights: Map<K, number>, allowed: (k: K) => boolean) =>
    [...weights.entries()]
      .filter(([k, w]) => w > 0 && allowed(k))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

  const learned = top(model.genres, (id) => SUGGESTION_GENRES.includes(id)).slice(0, 3);
  // Nový uživatel bez rozhodnutí: pár obecných startů, ať řádek není prázdný.
  const genres = learned.length ? learned : [878, 53, 16];
  const darkWeight = DARK_GENRES.reduce((sum, id) => sum + Math.max(0, model.genres.get(id) ?? 0), 0);
  const [decade] = top(model.decades, () => true);
  const [language] = top(model.languages, (code) => SUGGESTION_LANGUAGES.includes(code));
  // Režiséři dopředu, z ostatních náhodně, ať se návrhy mezi návštěvami obměňují.
  const favourites = [
    ...shuffle(people.filter((p) => p.department === "Directing")),
    ...shuffle(people.filter((p) => p.department !== "Directing")),
  ].slice(0, 2);

  return [
    ...genres.map((id): ChatSuggestion => ({ kind: "genre", id })),
    ...favourites.map((p): ChatSuggestion => ({ kind: "person", name: p.name, department: p.department })),
    ...(darkWeight > 0 ? [{ kind: "dark" } as const] : []),
    ...(decade != null ? [{ kind: "decade", decade } as const] : []),
    ...(language ? [{ kind: "language", code: language } as const] : []),
    { kind: "surprise" },
  ];
}
