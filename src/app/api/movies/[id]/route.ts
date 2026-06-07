import { getSessionUserId, requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getMovieDetails, isTmdbConfigured } from "@/lib/tmdb";
import {
  resolveCzdbForMovie,
  parseCzdbRating,
  splitPeople,
  type CzdbFilm,
} from "@/lib/czdb";
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

  let czdbFilm: CzdbFilm | null = cached?.czdbData ? JSON.parse(cached.czdbData) : null;
  let csfdRating = cached?.csfdRating ?? null;
  let csfdUrl = cached?.csfdUrl ?? null;

  if (stale || !czdbFilm) {
    const year = movieData.release_date?.slice(0, 4);
    const rejectedIds: number[] = cached?.rejectedCzdbIds
      ? JSON.parse(cached.rejectedCzdbIds)
      : [];

    czdbFilm = await resolveCzdbForMovie({
      title: movieData.title,
      originalTitle: movieData.original_title,
      year,
      imdbId: movieData.imdb_id,
      tmdbId,
      rejectedIds,
    });

    if (czdbFilm) {
      csfdRating = parseCzdbRating(czdbFilm.hodnoceni);
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
    card: buildMovieCardSummary(movieData, czdbFilm),
    csfdRating,
    csfdUrl,
    czdb: czdbFilm,
    userMovie,
  });
}
