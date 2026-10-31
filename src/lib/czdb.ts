const CZDB_BASE = "https://api.czdb.cz/search";

export type CzdbFilm = {
  id: number;
  nazev: string;
  original: string;
  alt_nazev?: string;
  csfd_url: string;
  csfd_id: number;
  tmdb_id: number | null;
  imdb_id: string;
  typ: string;
  zeme: string;
  rok: number;
  plot: string | null;
  hodnoceni: string;
  zanr: string;
  cas: string;
  herci: string;
  rezie: string;
  scenar: string;
  kamera?: string;
  hudba: string;
  obrazek_url?: string;
  imgo?: string;
  backgrop?: string;
  site1?: string;
  url1?: string;
  site2?: string;
  url2?: string;
};

export type CzdbResponse = {
  results: CzdbFilm[];
  response: string;
};

async function czdbFetch(params: Record<string, string>): Promise<CzdbResponse | false> {
  const url = new URL(CZDB_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as CzdbResponse | false;
    if (data === false || !data?.results?.length) return false;
    return { ...data, results: data.results.map(normalizeCzdbFilm) };
  } catch {
    // CZDB je best-effort: timeout nebo výpadek nesmí zdržet kartu filmu.
    return false;
  }
}

const EMPTY = new Set(["", "N/A", "None", "null"]);

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * API posílá čísla jako řetězce (`"tmdb_id": "680"`), rok jako `year` místo `rok`
 * a prázdné hodnoty jako "None". Bez normalizace se `===` s TMDB ID nikdy netrefí.
 * Používá se i na starou cache z DB.
 */
export function normalizeCzdbFilm(raw: CzdbFilm): CzdbFilm {
  const r = raw as CzdbFilm & { year?: string | number };
  const clean = (v: string | undefined) => (v && !EMPTY.has(v.trim()) ? v : "N/A");
  return {
    ...r,
    id: toNumber(r.id) ?? 0,
    csfd_id: toNumber(r.csfd_id) ?? 0,
    tmdb_id: toNumber(r.tmdb_id) || null,
    rok: toNumber(r.rok ?? r.year) ?? 0,
    zanr: clean(r.zanr),
    herci: clean(r.herci),
    rezie: clean(r.rezie),
    scenar: clean(r.scenar),
    hudba: clean(r.hudba),
  };
}

export function parseCzdbRating(hodnoceni: string | null | undefined): number | null {
  if (!hodnoceni) return null;
  const match = hodnoceni.match(/(\d{1,3})\s*%/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseRuntimeMinutes(cas: string | null | undefined): number | null {
  if (!cas || cas === "N/A") return null;
  const match = cas.match(/(\d+)\s*minut/);
  return match ? parseInt(match[1], 10) : null;
}

export async function searchCzdbByTitle(title: string, year?: string): Promise<CzdbFilm | null> {
  const params: Record<string, string> = { q: title };
  if (year) params.y = year;
  const data = await czdbFetch(params);
  if (!data) return null;
  return data.results[0] ?? null;
}

export async function searchCzdbByImdb(imdbId: string): Promise<CzdbFilm | null> {
  const data = await czdbFetch({ i: imdbId });
  if (!data) return null;
  return pickBestMatch(data.results, imdbId);
}

export async function searchCzdbByTmdb(
  tmdbId: number,
  title?: string,
  year?: string,
): Promise<CzdbFilm | null> {
  if (!title) return null;
  const params: Record<string, string> = { q: title };
  if (year) params.y = year;
  const data = await czdbFetch(params);
  if (!data) return null;
  return data.results.find((r) => r.tmdb_id === tmdbId) ?? null;
}

export async function searchCzdbByCsfdUrl(url: string): Promise<CzdbFilm | null> {
  const data = await czdbFetch({ url });
  if (!data) return null;
  return data.results[0] ?? null;
}

export async function searchCzdbByCsfdId(csfdId: number): Promise<CzdbFilm | null> {
  const data = await czdbFetch({ uid: String(csfdId) });
  if (!data) return null;
  return data.results[0] ?? null;
}

function pickBestMatch(results: CzdbFilm[], imdbId: string): CzdbFilm | null {
  const exact = results.find((r) => r.imdb_id === imdbId);
  if (exact) return exact;
  const movie = results.find((r) => r.typ === "movie");
  return movie ?? results[0] ?? null;
}

type MatchOptions = {
  tmdbId?: number;
  imdbId?: string | null;
  year?: string;
  /** Názvy filmu z TMDB (lokalizovaný, originální, anglický…). */
  titles?: Array<string | null | undefined>;
};

function normTitle(value: string | null | undefined): string {
  if (!value || EMPTY.has(value.trim()) || value.trim() === "@") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Ani jedno ID z CZDB není spolehlivé: hledání podle IMDb vrací cizí filmy
 * s razítkem dotazovaného IMDb ID (Pulp Fiction → „Svědectví“) a `tmdb_id`
 * je občas jiné (Dunkerk). Rozhoduje proto shoda TMDB ID, nebo přesná shoda
 * originálního názvu a rok ±1.
 */
export function isValidCzdbMatch(film: CzdbFilm, options: MatchOptions): boolean {
  film = normalizeCzdbFilm(film);
  if (options.tmdbId && film.tmdb_id === options.tmdbId) return true;

  if (options.year && film.rok) {
    if (Math.abs(parseInt(options.year, 10) - film.rok) > 1) return false;
  }

  const wanted = new Set((options.titles ?? []).map(normTitle).filter(Boolean));
  if (wanted.size === 0) {
    // Bez názvů (starší volání) zůstávají jen ID.
    if (options.tmdbId && film.tmdb_id && film.tmdb_id !== options.tmdbId) return false;
    if (options.imdbId && film.imdb_id && film.imdb_id !== "N/A" && film.imdb_id !== options.imdbId) {
      return false;
    }
    return true;
  }

  // Český název jen tam, kde CZDB originál nemá (posílá "@"). Jinak by prošly
  // řádky s náhodně sedícím `nazev` a cizím originálem.
  const own = normTitle(film.original) ? [film.original, film.alt_nazev] : [film.nazev, film.alt_nazev];
  return own.some((t) => {
    const n = normTitle(t);
    return n !== "" && wanted.has(n);
  });
}

function pickFromResults(
  results: CzdbFilm[],
  options: MatchOptions & { rejectedIds?: number[] },
): CzdbFilm | null {
  const rejected = new Set(options.rejectedIds ?? []);
  const validated = results.filter((r) => !rejected.has(r.id) && isValidCzdbMatch(r, options));
  if (validated.length === 0) return null;

  return (
    (options.tmdbId && validated.find((r) => r.tmdb_id === options.tmdbId)) ||
    validated.find((r) => r.typ === "movie") ||
    validated[0]
  );
}

/** Resolve CZDB data for a TMDB movie (best-effort chain) */
export async function resolveCzdbForMovie(options: {
  title: string;
  originalTitle?: string;
  /** Další názvy pro ověření shody (anglický, český z TMDB). */
  extraTitles?: Array<string | null | undefined>;
  year?: string;
  imdbId?: string | null;
  tmdbId?: number;
  rejectedIds?: number[];
}): Promise<CzdbFilm | null> {
  const searchTitles = [
    options.title,
    options.originalTitle,
    ...(options.extraTitles ?? []),
  ].filter((t, i, arr) => t && arr.indexOf(t) === i) as string[];
  const matchOptions = { ...options, titles: searchTitles };

  // Všechny dotazy paralelně, výsledek se vybírá v pořadí priority (IMDb, pak tituly).
  const queries: Record<string, string>[] = [
    ...(options.imdbId ? [{ i: options.imdbId }] : []),
    ...searchTitles.map((title): Record<string, string> =>
      options.year ? { q: title, y: options.year } : { q: title },
    ),
  ];
  const responses = await Promise.all(queries.map((params) => czdbFetch(params)));

  for (const data of responses) {
    if (!data) continue;
    const match = pickFromResults(data.results, matchOptions);
    if (match) return match;
  }

  return null;
}

export function czdbTrailers(film: CzdbFilm): Array<{ name: string; url: string }> {
  const trailers: Array<{ name: string; url: string }> = [];
  if (film.url1 && film.url1 !== "N/A") {
    trailers.push({ name: film.site1 ?? "Trailer 1", url: normalizeYoutubeUrl(film.url1) });
  }
  if (film.url2 && film.url2 !== "N/A") {
    trailers.push({ name: film.site2 ?? "Trailer 2", url: normalizeYoutubeUrl(film.url2) });
  }
  return trailers;
}

function normalizeYoutubeUrl(url: string): string {
  if (url.includes("embed/")) {
    const id = url.split("embed/")[1]?.split("?")[0];
    if (id) return `https://www.youtube.com/watch?v=${id}`;
  }
  return url;
}

export function splitPeople(value: string | null | undefined): string[] {
  if (!value || EMPTY.has(value.trim())) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
