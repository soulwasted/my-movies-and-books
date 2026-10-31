/**
 * Model vkusu: deterministické váhy z rozhodnutí uživatele.
 *
 * Bez I/O, aby šel testovat a počítat při každém načtení fronty v řádu ms.
 * Signál rozhodnutí: Viděl škálované hodnocením, Chci vidět +, Nezajímá mě −,
 * Přeskočit a „prošlo nabídkou“ jsou neutrální.
 */

export type DecisionStatus = "WATCHED" | "WANT" | "NOT_INTERESTED" | "SKIPPED" | "SEEN";

export type DecisionFeatures = {
  status: DecisionStatus;
  /** Hodnocení na škále 0–10, nebo null. */
  rating: number | null;
  genreIds: number[];
  year: number | null;
  language: string | null;
};

export type CandidateFeatures = {
  id: number;
  genreIds: number[];
  year: number | null;
  language: string | null;
  voteAverage: number;
  /** Titul filmu, ze kterého TMDB kandidáta doporučilo (silný signál). */
  recommendedBecause?: string;
};

export type TasteModel = {
  genres: Map<number, number>;
  decades: Map<number, number>;
  languages: Map<string, number>;
  decisionCount: number;
};

export type ScoredCandidate<C extends CandidateFeatures> = C & {
  score: number;
  /** Nejsilnější kladné žánry kandidáta (pro „Proč tenhle film?“). */
  topGenreIds: number[];
};

/** Kolik „virtuálních neutrálních“ rozhodnutí tlumí váhu klíče s málo daty. */
const SHRINK = 2;

export function decisionSignal(d: Pick<DecisionFeatures, "status" | "rating">): number {
  switch (d.status) {
    case "WATCHED":
      // 10 → +1, 6 → 0, 2 → −1; neohodnocené viděné je mírně kladné.
      return d.rating == null ? 0.3 : Math.max(-1, Math.min(1, (d.rating - 6) / 4));
    case "WANT":
      return 0.6;
    case "NOT_INTERESTED":
      return -0.8;
    default:
      return 0;
  }
}

export function decadeOf(year: number | null): number | null {
  return year == null ? null : Math.floor(year / 10) * 10;
}

function accumulate<K>(sums: Map<K, { sum: number; n: number }>, key: K, signal: number) {
  const entry = sums.get(key) ?? { sum: 0, n: 0 };
  entry.sum += signal;
  entry.n += 1;
  sums.set(key, entry);
}

function shrink<K>(sums: Map<K, { sum: number; n: number }>): Map<K, number> {
  const out = new Map<K, number>();
  for (const [key, { sum, n }] of sums) out.set(key, sum / (n + SHRINK));
  return out;
}

export function buildTasteModel(decisions: DecisionFeatures[]): TasteModel {
  const genres = new Map<number, { sum: number; n: number }>();
  const decades = new Map<number, { sum: number; n: number }>();
  const languages = new Map<string, { sum: number; n: number }>();
  let decisionCount = 0;

  for (const d of decisions) {
    const signal = decisionSignal(d);
    if (signal === 0) continue;
    decisionCount += 1;
    for (const g of d.genreIds) accumulate(genres, g, signal);
    const decade = decadeOf(d.year);
    if (decade != null) accumulate(decades, decade, signal);
    if (d.language) accumulate(languages, d.language, signal);
  }

  return {
    genres: shrink(genres),
    decades: shrink(decades),
    languages: shrink(languages),
    decisionCount,
  };
}

export function scoreCandidate<C extends CandidateFeatures>(
  model: TasteModel,
  c: C,
): ScoredCandidate<C> {
  const genreWeights = c.genreIds.map((g) => ({ g, w: model.genres.get(g) ?? 0 }));
  const genreScore = genreWeights.length
    ? genreWeights.reduce((s, x) => s + x.w, 0) / Math.sqrt(genreWeights.length)
    : 0;
  const decade = decadeOf(c.year);
  const decadeScore = decade != null ? (model.decades.get(decade) ?? 0) : 0;
  const languageScore = c.language ? (model.languages.get(c.language) ?? 0) : 0;
  // Slabá kvalitativní složka, aby při prázdném modelu vyhrály lepší filmy.
  const quality = (c.voteAverage - 6.5) / 10;
  const recommendation = c.recommendedBecause ? 0.25 : 0;

  return {
    ...c,
    score: genreScore + 0.5 * decadeScore + 0.3 * languageScore + quality + recommendation,
    topGenreIds: genreWeights
      .filter((x) => x.w > 0.05)
      .sort((a, b) => b.w - a.w)
      .slice(0, 2)
      .map((x) => x.g),
  };
}

/**
 * Seřadí kandidáty podle skóre a na pevné pozice vloží objevování: dobře
 * hodnocené filmy, které model zatím nepreferuje (mimo bublinu).
 */
export function rankQueue<C extends CandidateFeatures>(
  model: TasteModel,
  candidates: C[],
  options: {
    size: number;
    exploreShare: number;
    random?: () => number;
    /** Strop karet z jednoho zdrojového filmu, aby frontu neovládla jedna franšíza. */
    maxPerSource?: number;
  },
): Array<ScoredCandidate<C> & { explore: boolean }> {
  const random = options.random ?? Math.random;
  const unique = [...new Map(candidates.map((c) => [c.id, c])).values()];
  const scored = unique.map((c) => scoreCandidate(model, c)).sort((a, b) => b.score - a.score);

  const exploreCount = Math.round(options.size * options.exploreShare);
  const mainCount = options.size - exploreCount;
  const perSource = new Map<string, number>();
  const main: ScoredCandidate<C>[] = [];
  for (const c of scored) {
    if (main.length >= mainCount) break;
    const source = c.recommendedBecause;
    if (source && options.maxPerSource != null) {
      const used = perSource.get(source) ?? 0;
      if (used >= options.maxPerSource) continue;
      perSource.set(source, used + 1);
    }
    main.push(c);
  }
  const mainIds = new Set(main.map((c) => c.id));

  // Objevování: ze spodní poloviny skóre jen kvalitní filmy, náhodně.
  const rest = scored.filter((c) => !mainIds.has(c.id));
  const explorePool = rest.slice(Math.floor(rest.length / 2)).filter((c) => c.voteAverage >= 7);
  const explore: ScoredCandidate<C>[] = [];
  const pool = explorePool.length >= exploreCount ? [...explorePool] : [...rest];
  while (explore.length < exploreCount && pool.length) {
    explore.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  const out: Array<ScoredCandidate<C> & { explore: boolean }> = main.map((c) => ({
    ...c,
    explore: false,
  }));
  // Rovnoměrně rozprostřít, první objevování až po několika jistých kartách.
  const step = Math.max(1, Math.floor(out.length / (explore.length + 1)));
  explore.forEach((c, i) => {
    out.splice(Math.min(out.length, step * (i + 1) + i), 0, { ...c, explore: true });
  });
  return out.slice(0, options.size);
}

/**
 * Přimíchá AI tipy do seřazené fronty: nejvýš `max` tipů, nejvýš jeden mezi
 * prvními pěti kartami, bez duplicit. Tipy nahrazují karty od konce fronty.
 */
export function mixInAiTips<T extends { id: number }>(
  queue: T[],
  tips: T[],
  options: { max: number; firstSlot?: number; spacing?: number },
): T[] {
  const queueIds = new Set(queue.map((q) => q.id));
  const usable = tips.filter((t) => !queueIds.has(t.id)).slice(0, options.max);
  if (usable.length === 0) return queue;

  const out = queue.slice(0, Math.max(0, queue.length - usable.length));
  const firstSlot = options.firstSlot ?? 2;
  const spacing = options.spacing ?? 6;
  usable.forEach((tip, i) => {
    out.splice(Math.min(out.length, firstSlot + i * spacing), 0, tip);
  });
  return out;
}
