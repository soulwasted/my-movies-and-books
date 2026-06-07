import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getRecommendations, chatAboutMovies, type UserTasteProfile } from "@/lib/ai";
import { getGenres, getMovieDetails, isTmdbConfigured } from "@/lib/tmdb";
import { NextResponse } from "next/server";

async function buildProfile(userId: string, locale: "cs" | "en"): Promise<UserTasteProfile> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const genreIds: number[] = prefs?.favoriteGenreIds
    ? JSON.parse(prefs.favoriteGenreIds)
    : [];

  let favoriteGenres: string[] = [];
  if (isTmdbConfigured() && genreIds.length) {
    const genres = await getGenres();
    favoriteGenres = genres.filter((g) => genreIds.includes(g.id)).map((g) => g.name);
  }

  const userMovies = await prisma.userMovie.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const watched = [];
  const wantList: string[] = [];

  for (const um of userMovies) {
    if (um.status === "WANT") {
      if (isTmdbConfigured()) {
        try {
          const m = await getMovieDetails(um.tmdbId);
          wantList.push(m.title);
        } catch {
          wantList.push(`TMDB #${um.tmdbId}`);
        }
      }
    }
    if (um.status === "WATCHED") {
      if (isTmdbConfigured()) {
        try {
          const m = await getMovieDetails(um.tmdbId);
          watched.push({
            title: m.title,
            rating: um.rating,
            genres: m.genres.map((g) => g.name),
          });
        } catch {
          watched.push({ title: `TMDB #${um.tmdbId}`, rating: um.rating, genres: [] });
        }
      }
    }
  }

  const skippedCount = await prisma.userMovie.count({
    where: { userId, status: "SKIPPED" },
  });

  return { locale, watched, wantList, favoriteGenres, skippedCount };
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const locale = (body.locale === "en" ? "en" : "cs") as "cs" | "en";
  const profile = await buildProfile(userId, locale);

  if (body.type === "recommend") {
    const text = await getRecommendations(profile, 5);
    return NextResponse.json({ text });
  }

  if (body.type === "chat" && body.message) {
    const text = await chatAboutMovies(body.message, profile);
    return NextResponse.json({ text });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
