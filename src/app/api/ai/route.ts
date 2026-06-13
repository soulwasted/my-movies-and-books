import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getRecommendations, chatAboutMovies, type UserTasteProfile } from "@/lib/ai";
import { filterToCount } from "@/lib/ai-filter";
import {
  getBookRecommendations,
  chatAboutBooks,
  bookResponseToGeneric,
  type UserBookTasteProfile,
} from "@/lib/ai-books";
import { filterBookToCount } from "@/lib/ai-filter-books";
import { getCategoryNames } from "@/lib/book-categories";
import { getGenres, getMovieDetails, isTmdbConfigured } from "@/lib/tmdb";
import { getBookDetails, bookYear, isGoogleBooksConfigured } from "@/lib/google-books";
import { normalizeToScale } from "@/lib/rating";
import { NextResponse } from "next/server";

async function buildMovieProfile(userId: string, locale: "cs" | "en"): Promise<UserTasteProfile> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const genreIds: number[] = prefs?.favoriteGenreIds
    ? JSON.parse(prefs.favoriteGenreIds)
    : [];

  let favoriteGenres: string[] = [];
  if (isTmdbConfigured() && genreIds.length) {
    const genres = await getGenres();
    favoriteGenres = genres.filter((g) => genreIds.includes(g.id)).map((g) => g.name);
  }

  const excludedRows = await prisma.userMovie.findMany({
    where: { userId, status: { in: ["WATCHED", "WANT"] } },
    select: { tmdbId: true, status: true, rating: true, ratingType: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const excludedTmdbIds = excludedRows.map((r) => r.tmdbId);
  const excludedTitles: Array<{ title: string; year: number }> = [];
  const wantList: string[] = [];
  const watched: UserTasteProfile["watched"] = [];

  if (isTmdbConfigured()) {
    await Promise.all(
      excludedRows.map(async (um) => {
        try {
          const m = await getMovieDetails(um.tmdbId);
          const year = parseInt(m.release_date?.slice(0, 4) ?? "0", 10) || 0;
          const label = m.title;
          excludedTitles.push({ title: label, year });

          if (um.status === "WANT") {
            wantList.push(label);
          }
          if (um.status === "WATCHED") {
            watched.push({
              title: label,
              rating:
                um.rating != null
                  ? normalizeToScale(um.rating, um.ratingType)
                  : um.rating,
              genres: m.genres.map((g) => g.name),
            });
          }
        } catch {
          excludedTitles.push({ title: `TMDB #${um.tmdbId}`, year: 0 });
        }
      }),
    );
  }

  const skippedCount = await prisma.userMovie.count({
    where: { userId, status: "SKIPPED" },
  });

  return {
    locale,
    watched,
    wantList,
    excludedTitles,
    excludedTmdbIds,
    favoriteGenres,
    skippedCount,
  };
}

async function buildBookProfile(
  userId: string,
  locale: "cs" | "en",
): Promise<UserBookTasteProfile> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const categoryIds: string[] = prefs?.favoriteBookCategoryIds
    ? JSON.parse(prefs.favoriteBookCategoryIds)
    : [];

  const favoriteCategories = getCategoryNames(categoryIds, locale);

  const excludedRows = await prisma.userBook.findMany({
    where: { userId, status: { in: ["READ", "WANT"] } },
    select: {
      googleVolumeId: true,
      status: true,
      rating: true,
      ratingType: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const excludedVolumeIds = excludedRows.map((r) => r.googleVolumeId);
  const excludedTitles: Array<{ title: string; author: string; year: number }> = [];
  const wantList: string[] = [];
  const read: UserBookTasteProfile["read"] = [];

  if (isGoogleBooksConfigured()) {
    await Promise.all(
      excludedRows.map(async (ub) => {
        try {
          const b = await getBookDetails(ub.googleVolumeId);
          const year = parseInt(bookYear(b.publishedDate) ?? "0", 10) || 0;
          const author = b.authors[0] ?? "";
          excludedTitles.push({ title: b.title, author, year });

          if (ub.status === "WANT") {
            wantList.push(`${b.title} (${author})`);
          }
          if (ub.status === "READ") {
            read.push({
              title: b.title,
              author,
              rating:
                ub.rating != null
                  ? normalizeToScale(ub.rating, ub.ratingType)
                  : ub.rating,
              categories: b.categories,
            });
          }
        } catch {
          excludedTitles.push({ title: `Book #${ub.googleVolumeId}`, author: "", year: 0 });
        }
      }),
    );
  }

  const skippedCount = await prisma.userBook.count({
    where: { userId, status: "SKIPPED" },
  });

  return {
    locale,
    read,
    wantList,
    excludedTitles,
    excludedVolumeIds,
    favoriteCategories,
    skippedCount,
  };
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
  const media = body.media === "book" ? "book" : "movie";

  if (media === "book") {
    const profile = await buildBookProfile(userId, locale);

    if (body.type === "recommend") {
      const raw = await getBookRecommendations(profile, 5);
      const filtered = await filterBookToCount(
        raw,
        new Set(profile.excludedVolumeIds),
        profile.excludedTitles,
        5,
      );
      return NextResponse.json({ response: bookResponseToGeneric(filtered), media: "book" });
    }

    if (body.type === "chat" && body.message) {
      const raw = await chatAboutBooks(body.message, profile);
      const filtered = await filterBookToCount(
        raw,
        new Set(profile.excludedVolumeIds),
        profile.excludedTitles,
        8,
      );
      return NextResponse.json({ response: bookResponseToGeneric(filtered), media: "book" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const profile = await buildMovieProfile(userId, locale);

  if (body.type === "recommend") {
    const raw = await getRecommendations(profile, 5);
    const excludedSet = new Set(profile.excludedTmdbIds);
    const response = await filterToCount(raw, excludedSet, profile.excludedTitles, 5);
    return NextResponse.json({ response, media: "movie" });
  }

  if (body.type === "chat" && body.message) {
    const raw = await chatAboutMovies(body.message, profile);
    const excludedSet = new Set(profile.excludedTmdbIds);
    const response = await filterToCount(raw, excludedSet, profile.excludedTitles, 8);
    return NextResponse.json({ response, media: "movie" });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
