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

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return false;

  const data = (await res.json()) as CzdbResponse | false;
  if (data === false || !data?.results?.length) return false;
  return data;
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

/** Resolve CZDB data for a TMDB movie (best-effort chain) */
export async function resolveCzdbForMovie(options: {
  title: string;
  year?: string;
  imdbId?: string | null;
  tmdbId?: number;
}): Promise<CzdbFilm | null> {
  if (options.imdbId) {
    const byImdb = await searchCzdbByImdb(options.imdbId);
    if (byImdb) return byImdb;
  }
  if (options.tmdbId && options.title) {
    const byTmdb = await searchCzdbByTmdb(options.tmdbId, options.title, options.year);
    if (byTmdb) return byTmdb;
  }
  return searchCzdbByTitle(options.title, options.year);
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
  if (!value || value === "N/A") return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
