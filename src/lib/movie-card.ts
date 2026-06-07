import type { CzdbFilm } from "@/lib/czdb";
import { splitPeople, isValidCzdbMatch, parseCzdbRating } from "@/lib/czdb";
import {
  getComposers,
  getCzechOverview,
  getCzechTitle,
  getDirectors,
  getWriters,
  posterUrl,
  type TmdbMovieDetail,
} from "@/lib/tmdb";

export type MovieCardSummary = {
  tmdbId: number;
  czechTitle: string;
  originalTitle: string;
  overview: string;
  directors: string[];
  writers: string[];
  composers: string[];
  cast: string[];
  poster: string | null;
  year: string | null;
  runtime: number | null;
  voteAverage: number;
  csfdRating: number | null;
};

function firstText(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value && value.trim() && value.trim() !== "N/A") {
      return value.trim();
    }
  }
  return "";
}

function mergePeople(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    for (const name of list) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(name);
      }
    }
  }
  return merged;
}

export function buildMovieCardSummary(
  movie: TmdbMovieDetail,
  czdb: CzdbFilm | null,
): MovieCardSummary {
  const czdbTrusted =
    czdb &&
    isValidCzdbMatch(czdb, {
      tmdbId: movie.id,
      imdbId: movie.imdb_id,
      year: movie.release_date?.slice(0, 4),
    });

  const trustedCzdb = czdbTrusted ? czdb : null;

  return {
    tmdbId: movie.id,
    czechTitle: trustedCzdb?.nazev ?? getCzechTitle(movie) ?? movie.title,
    originalTitle: movie.original_title,
    overview: firstText(
      trustedCzdb?.plot,
      getCzechOverview(movie),
      movie.overview,
    ),
    directors: mergePeople(
      splitPeople(trustedCzdb?.rezie),
      getDirectors(movie).map((d) => d.name),
    ).slice(0, 4),
    writers: mergePeople(
      splitPeople(trustedCzdb?.scenar),
      getWriters(movie).map((w) => w.name),
    ).slice(0, 4),
    composers: mergePeople(
      splitPeople(trustedCzdb?.hudba),
      getComposers(movie).map((c) => c.name),
    ).slice(0, 4),
    cast: mergePeople(
      splitPeople(trustedCzdb?.herci),
      movie.credits.cast.slice(0, 8).map((c) => c.name),
    ).slice(0, 6),
    poster: posterUrl(movie.poster_path, "w500") ?? trustedCzdb?.obrazek_url ?? null,
    year: movie.release_date?.slice(0, 4) ?? (trustedCzdb?.rok ? String(trustedCzdb.rok) : null),
    runtime: movie.runtime ?? null,
    voteAverage: movie.vote_average,
    csfdRating: trustedCzdb ? parseCzdbRating(trustedCzdb.hodnoceni) : null,
  };
}
