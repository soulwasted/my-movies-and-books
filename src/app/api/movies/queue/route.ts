import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import {
  discoverMovies,
  getTopRated,
  getTrending,
  isTmdbConfigured,
  DEMO_MOVIES,
  type TmdbMovieListItem,
} from "@/lib/tmdb";
import { NextResponse } from "next/server";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const genreIds: number[] = prefs?.favoriteGenreIds
    ? JSON.parse(prefs.favoriteGenreIds)
    : [];

  const existing = await prisma.userMovie.findMany({
    where: { userId },
    select: { tmdbId: true },
  });
  const exclude = new Set(existing.map((e) => e.tmdbId));

  let pool: TmdbMovieListItem[] = [];

  if (!isTmdbConfigured()) {
    pool = DEMO_MOVIES.filter((m) => !exclude.has(m.id));
    return NextResponse.json({ movies: pool });
  }

  try {
    const page = Math.floor(Math.random() * 5) + 1;
    const sources = await Promise.all([
      getTrending(page),
      getTopRated(page),
      discoverMovies({ genreIds, page }),
      discoverMovies({ page: page + 1, sortBy: "vote_average.desc" }),
    ]);

    const merged = new Map<number, TmdbMovieListItem>();
    for (const source of sources) {
      for (const movie of source.results) {
        if (!exclude.has(movie.id)) merged.set(movie.id, movie);
      }
    }

    pool = shuffle([...merged.values()]).slice(0, 20);
  } catch {
    pool = DEMO_MOVIES.filter((m) => !exclude.has(m.id));
  }

  return NextResponse.json({ movies: pool });
}
