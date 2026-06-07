const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p";

export type TmdbMovieListItem = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  runtime?: number;
};

export type TmdbGenre = { id: number; name: string };

export type TmdbCreditPerson = {
  id: number;
  name: string;
  job?: string;
  character?: string;
  profile_path: string | null;
};

export type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  name: string;
};

export type TmdbMovieDetail = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  genres: TmdbGenre[];
  imdb_id: string | null;
  credits: {
    cast: TmdbCreditPerson[];
    crew: TmdbCreditPerson[];
  };
  videos: { results: TmdbVideo[] };
  translations?: {
    translations: Array<{
      iso_3166_1: string;
      iso_639_1: string;
      data: { title: string; overview: string };
    }>;
  };
};

export type TmdbPerson = {
  id: number;
  name: string;
  biography: string;
  profile_path: string | null;
  known_for_department: string;
  movie_credits?: {
    cast: Array<TmdbMovieListItem & { character: string }>;
    crew: Array<TmdbMovieListItem & { job: string }>;
  };
};

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!token && !apiKey) {
    throw new Error("TMDB credentials not configured");
  }

  const url = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status} ${path}`);
  }

  return res.json() as Promise<T>;
}

export function posterUrl(path: string | null, size: "w342" | "w500" | "original" = "w500") {
  if (!path) return null;
  return `${TMDB_IMAGE}/${size}${path}`;
}

export function profileUrl(path: string | null) {
  if (!path) return null;
  return `${TMDB_IMAGE}/w185${path}`;
}

export async function getGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", { language: "en-US" });
  return data.genres;
}

export async function getMovieDetails(id: number, locale = "cs-CZ"): Promise<TmdbMovieDetail> {
  const [movie, credits, videos, translations] = await Promise.all([
    tmdbFetch<Omit<TmdbMovieDetail, "credits" | "videos" | "translations">>(`/movie/${id}`, {
      language: locale,
      append_to_response: "external_ids",
    }),
    tmdbFetch<TmdbMovieDetail["credits"]>(`/movie/${id}/credits`),
    tmdbFetch<{ results: TmdbVideo[] }>(`/movie/${id}/videos`, { language: locale }),
    tmdbFetch<TmdbMovieDetail["translations"]>(`/movie/${id}/translations`),
  ]);

  return { ...movie, credits, videos, translations };
}

export async function getPersonDetails(id: number, locale = "cs-CZ"): Promise<TmdbPerson> {
  const person = await tmdbFetch<TmdbPerson>(`/person/${id}`, {
    language: locale,
    append_to_response: "movie_credits",
  });
  return person;
}

export async function discoverMovies(options: {
  genreIds?: number[];
  page?: number;
  sortBy?: string;
}): Promise<{ results: TmdbMovieListItem[]; total_pages: number }> {
  const params: Record<string, string> = {
    language: "cs-CZ",
    sort_by: options.sortBy ?? "popularity.desc",
    page: String(options.page ?? 1),
    include_adult: "false",
  };
  if (options.genreIds?.length) {
    params.with_genres = options.genreIds.join(",");
  }
  return tmdbFetch("/discover/movie", params);
}

export async function getTopRated(page = 1) {
  return tmdbFetch<{ results: TmdbMovieListItem[] }>("/movie/top_rated", {
    language: "cs-CZ",
    page: String(page),
  });
}

export async function getTrending(page = 1) {
  return tmdbFetch<{ results: TmdbMovieListItem[] }>("/trending/movie/week", {
    language: "cs-CZ",
    page: String(page),
  });
}

export async function searchMovies(query: string) {
  return tmdbFetch<{ results: TmdbMovieListItem[] }>("/search/movie", {
    language: "cs-CZ",
    query,
  });
}

export function getCzechTitle(movie: TmdbMovieDetail): string | null {
  const cs = movie.translations?.translations.find(
    (t) => t.iso_639_1 === "cs" || t.iso_3166_1 === "CZ",
  );
  return cs?.data.title ?? null;
}

export function getDirectors(movie: TmdbMovieDetail) {
  return movie.credits.crew.filter((c) => c.job === "Director");
}

export function getWriters(movie: TmdbMovieDetail) {
  return movie.credits.crew.filter((c) => c.job === "Screenplay" || c.job === "Writer");
}

export function getComposers(movie: TmdbMovieDetail) {
  return movie.credits.crew.filter(
    (c) => c.job === "Original Music Composer" || c.job === "Music",
  );
}

export function getTrailers(movie: TmdbMovieDetail) {
  return movie.videos.results.filter((v) => v.site === "YouTube" && v.type === "Trailer");
}

export function formatRuntime(minutes: number | null, locale: "cs" | "en") {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "cs") return h ? `${h} h ${m} min` : `${m} min`;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function imdbUrl(imdbId: string | null) {
  return imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;
}

/** Demo movies when TMDB is not configured */
export const DEMO_MOVIES: TmdbMovieListItem[] = [
  {
    id: 680,
    title: "Pulp Fiction",
    original_title: "Pulp Fiction",
    overview: "The lives of two mob hitmen, a boxer, and more intertwine in Los Angeles.",
    poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop_path: "/suaEOtz1LN5QLjjUXHMrHm8/zFX.jpg",
    release_date: "1994-09-10",
    vote_average: 8.5,
    genre_ids: [53, 80],
    runtime: 154,
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    original_title: "The Shawshank Redemption",
    overview: "Two imprisoned men bond over years, finding solace and redemption.",
    poster_path: "/9cqN9j0dF5q0K8i8O9z0R9.jpg",
    backdrop_path: null,
    release_date: "1994-09-23",
    vote_average: 8.7,
    genre_ids: [18, 80],
    runtime: 142,
  },
];

export function isTmdbConfigured() {
  return Boolean(process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY);
}
