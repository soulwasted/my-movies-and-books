import type { CzdbFilm } from "@/lib/czdb";
import { splitPeople, isValidCzdbMatch, parseCzdbRating } from "@/lib/czdb";
import {
  getComposers,
  getCzechOverview,
  getEnglishTitle,
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
  genres: string[];
  /** TMDB lidé podle jména malými písmeny: jméno na kartě se z nich prolinkuje a dá se oblíbit. */
  people: Record<string, CardPerson>;
  /** Oblíbení lidé přihlášeného uživatele (doplní API, ne builder). */
  favoritePersonIds?: number[];
};

export type CardPerson = { tmdbPersonId: number; name: string; profilePath: string | null; department: string };

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
  /** Živé hodnocení z ČSFD; bez něj zůstává snímek z CZDB. */
  csfdRating?: number | null,
): MovieCardSummary {
  const czdbTrusted =
    czdb &&
    isValidCzdbMatch(czdb, {
      tmdbId: movie.id,
      imdbId: movie.imdb_id,
      year: movie.release_date?.slice(0, 4),
      titles: [movie.title, movie.original_title, getEnglishTitle(movie), getCzechTitle(movie)],
      directors: getDirectors(movie).map((d) => d.name),
    });

  const trustedCzdb = czdbTrusted ? czdb : null;

  // Profese z tohoto filmu, stejně jako na detailu: režisér se oblíbí jako režie.
  const people: Record<string, CardPerson> = {};
  const addPeople = (list: { id: number; name: string; profile_path: string | null }[], department: string) => {
    for (const p of list) {
      people[p.name.toLowerCase()] ??= { tmdbPersonId: p.id, name: p.name, profilePath: p.profile_path, department };
    }
  };
  addPeople(getDirectors(movie), "Directing");
  addPeople(getWriters(movie), "Writing");
  addPeople(getComposers(movie), "Sound");
  addPeople(movie.credits.cast.slice(0, 12), "Acting");

  return {
    tmdbId: movie.id,
    czechTitle:
      trustedCzdb?.nazev ?? getCzechTitle(movie) ?? getEnglishTitle(movie) ?? movie.title,
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
    poster: posterUrl(movie.poster_path, "w342") ?? trustedCzdb?.obrazek_url ?? null,
    year: movie.release_date?.slice(0, 4) ?? (trustedCzdb?.rok ? String(trustedCzdb.rok) : null),
    runtime: movie.runtime ?? null,
    voteAverage: movie.vote_average,
    csfdRating: trustedCzdb ? (csfdRating ?? parseCzdbRating(trustedCzdb.hodnoceni)) : null,
    // TMDB vrací názvy žánrů v jazyce dotazu (cs-CZ), CZDB jako záloha.
    genres: movie.genres?.length
      ? movie.genres.map((g) => g.name)
      : splitPeople(trustedCzdb?.zanr),
    people,
  };
}
