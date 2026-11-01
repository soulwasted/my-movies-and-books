import { getSessionUserId, requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getMovieDetails, getCzechTitle, getDirectors, getEnglishTitle, isTmdbConfigured } from "@/lib/tmdb";
import {
  resolveCzdbForMovie,
  parseCzdbRating,
  splitPeople,
  normalizeCzdbFilm,
  isValidCzdbMatch,
  type CzdbFilm,
} from "@/lib/czdb";
import { fetchCsfdRating } from "@/lib/csfd";
import { buildMovieCardSummary } from "@/lib/movie-card";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let cached = await prisma.movieCache.findUnique({ where: { tmdbId } });
  let movieData = cached ? JSON.parse(cached.data) : null;

  if (!movieData && isTmdbConfigured()) {
    try {
      movieData = await getMovieDetails(tmdbId);
      await prisma.movieCache.upsert({
        where: { tmdbId },
        create: { tmdbId, data: JSON.stringify(movieData) },
        update: { data: JSON.stringify(movieData) },
      });
    } catch {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
  }

  if (!movieData) {
    return NextResponse.json({ error: "TMDB not configured" }, { status: 503 });
  }

  const stale =
    !cached?.csfdUpdated ||
    Date.now() - cached.csfdUpdated.getTime() > 7 * 24 * 60 * 60 * 1000;

  const year = movieData.release_date?.slice(0, 4);
  const directors = getDirectors(movieData).map((d) => d.name);
  let czdbFilm: CzdbFilm | null = cached?.czdbData ? normalizeCzdbFilm(JSON.parse(cached.czdbData)) : null;
  let csfdRating = cached?.csfdRating ?? null;
  let csfdUrl = cached?.csfdUrl ?? null;
  // Špatně napárovaný záznam z cache (starší pravidla) se dohledá znovu hned.
  const cachedInvalid =
    czdbFilm !== null &&
    !isValidCzdbMatch(czdbFilm, {
      tmdbId,
      imdbId: movieData.imdb_id,
      year,
      titles: [movieData.title, movieData.original_title, getEnglishTitle(movieData), getCzechTitle(movieData)],
      directors,
    });

  // Re-resolve jen když je cache stará nebo chybná. Film bez shody v CZDB se nezkouší
  // znovu při každém zobrazení karty (dřív to byly až 3 externí requesty pokaždé).
  if (stale || cachedInvalid) {
    const rejectedIds: number[] = cached?.rejectedCzdbIds
      ? JSON.parse(cached.rejectedCzdbIds)
      : [];

    czdbFilm = await resolveCzdbForMovie({
      title: movieData.title,
      originalTitle: movieData.original_title,
      extraTitles: [getEnglishTitle(movieData), getCzechTitle(movieData)],
      year,
      imdbId: movieData.imdb_id,
      tmdbId,
      directors,
      rejectedIds,
    });

    if (czdbFilm) {
      csfdRating =
        (await fetchCsfdRating(czdbFilm.csfd_url)) ?? parseCzdbRating(czdbFilm.hodnoceni);
      csfdUrl = czdbFilm.csfd_url;
    } else {
      csfdRating = null;
      csfdUrl = null;
    }

    await prisma.movieCache.upsert({
      where: { tmdbId },
      create: {
        tmdbId,
        data: JSON.stringify(movieData),
        csfdRating,
        csfdUrl,
        czdbId: czdbFilm?.id ?? null,
        czdbData: czdbFilm ? JSON.stringify(czdbFilm) : null,
        rejectedCzdbIds: JSON.stringify(rejectedIds),
        csfdUpdated: new Date(),
      },
      update: {
        csfdRating,
        csfdUrl,
        czdbId: czdbFilm?.id ?? null,
        czdbData: czdbFilm ? JSON.stringify(czdbFilm) : null,
        csfdUpdated: new Date(),
      },
    });
  }

  const userId = await getSessionUserId();
  let userMovie = null;
  if (userId) {
    userMovie = await prisma.userMovie.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } },
    });
  }

  return NextResponse.json({
    movie: movieData,
    card: buildMovieCardSummary(movieData, czdbFilm, csfdRating),
    csfdRating,
    csfdUrl,
    czdb: czdbFilm,
    userMovie,
  });
}
