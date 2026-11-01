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
import { getGenres, getMovieDetails, isTmdbConfigured, type TmdbMovieDetail } from "@/lib/tmdb";
import {
  getBookDetails,
  bookYear,
  isGoogleBooksConfigured,
  type GoogleBookDetail,
} from "@/lib/google-books";
import { normalizeToScale } from "@/lib/rating";
import { sanitizeHistory } from "@/lib/ai-model";
import { getTasteProfile } from "@/lib/taste-profile";
import { NextResponse } from "next/server";
import type { AiResult, AiStep, AiStreamEvent } from "@/lib/ai-stream";

export const maxDuration = 60;

/** Kolik filmů AI ukáže (chat i tlačítko); AI navrhne víc kvůli filtrování viděných. */
const MOVIE_PICKS = 3;

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
    where: { userId, status: { in: ["WATCHED", "WANT", "NOT_INTERESTED"] } },
    select: { tmdbId: true, status: true, rating: true, ratingType: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const excludedTmdbIds = excludedRows.map((r) => r.tmdbId);
  const excludedTitles: Array<{ title: string; year: number }> = [];
  const wantList: string[] = [];
  const notInterested: string[] = [];
  const watched: UserTasteProfile["watched"] = [];

  // Detaily z DB cache (jeden dotaz); TMDB jen pro filmy, které v cache chybí.
  const cachedRows = await prisma.movieCache.findMany({
    where: { tmdbId: { in: excludedTmdbIds } },
    select: { tmdbId: true, data: true },
  });
  const cachedById = new Map(
    cachedRows.map((r) => [r.tmdbId, JSON.parse(r.data) as TmdbMovieDetail]),
  );

  if (isTmdbConfigured() || cachedById.size > 0) {
    await Promise.all(
      excludedRows.map(async (um) => {
        try {
          const m = cachedById.get(um.tmdbId) ?? (await getMovieDetails(um.tmdbId));
          const year = parseInt(m.release_date?.slice(0, 4) ?? "0", 10) || 0;
          const label = m.title;
          excludedTitles.push({ title: label, year });

          if (um.status === "WANT") {
            wantList.push(label);
          }
          if (um.status === "NOT_INTERESTED") {
            notInterested.push(label);
          }
          if (um.status === "WATCHED") {
            watched.push({
              title: label,
              rating:
                um.rating != null
                  ? normalizeToScale(um.rating, um.ratingType)
                  : um.rating,
              genres: (m.genres ?? []).map((g) => g.name),
            });
          }
        } catch {
          excludedTitles.push({ title: `TMDB #${um.tmdbId}`, year: 0 });
        }
      }),
    );
  }

  const [skippedCount, tasteProfile, people] = await Promise.all([
    prisma.userMovie.count({ where: { userId, status: "SKIPPED" } }),
    getTasteProfile(userId).catch(() => null),
    prisma.favoritePerson.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return {
    locale,
    watched,
    wantList,
    notInterested,
    tasteSummary: tasteProfile?.summary,
    favoritePeople: people.map((p) => `${p.name} (${p.department})`),
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
    where: { userId, status: { in: ["READ", "WANT", "NOT_INTERESTED"] } },
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
  const notInterested: string[] = [];
  const read: UserBookTasteProfile["read"] = [];

  const cachedRows = await prisma.bookCache.findMany({
    where: { googleVolumeId: { in: excludedVolumeIds } },
    select: { googleVolumeId: true, data: true },
  });
  const cachedById = new Map(
    cachedRows.map((r) => [r.googleVolumeId, JSON.parse(r.data) as GoogleBookDetail]),
  );

  if (isGoogleBooksConfigured() || cachedById.size > 0) {
    await Promise.all(
      excludedRows.map(async (ub) => {
        try {
          const b =
            cachedById.get(ub.googleVolumeId) ?? (await getBookDetails(ub.googleVolumeId));
          const year = parseInt(bookYear(b.publishedDate) ?? "0", 10) || 0;
          const author = b.authors[0] ?? "";
          excludedTitles.push({ title: b.title, author, year });

          if (ub.status === "WANT") {
            wantList.push(`${b.title} (${author})`);
          }
          if (ub.status === "NOT_INTERESTED") {
            notInterested.push(`${b.title} (${author})`);
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
    notInterested,
    excludedTitles,
    excludedVolumeIds,
    favoriteCategories,
    skippedCount,
  };
}

/**
 * Odpoví NDJSON streamem: řádek za každý skutečný krok, na konci výsledek nebo chyba.
 * Klient tak v loaderu ukazuje, co server právě dělá, místo vymyšlených hlášek.
 */
function streamSteps(
  failure: string,
  run: (step: (s: AiStep) => void) => Promise<AiResult>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AiStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const result = await run((step) => send({ type: "step", step }));
        send({ type: "result", ...result });
      } catch (err) {
        console.error("[api/ai]", err);
        send({ type: "error", error: failure });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const locale = (body.locale === "en" ? "en" : "cs") as "cs" | "en";
  const media = body.media === "book" ? "book" : "movie";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = sanitizeHistory(body.history);

  if (body.type !== "recommend" && !(body.type === "chat" && message)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const failure =
    locale === "cs"
      ? "AI teď neodpovídá. Zkus to prosím za chvíli."
      : "AI is not responding right now. Please try again shortly.";

  return streamSteps(failure, async (step) => {
    step({ id: "profile" });

    if (media === "book") {
      const profile = await buildBookProfile(userId, locale);
      const excluded = new Set(profile.excludedVolumeIds);
      const count = body.type === "recommend" ? 5 : 8;

      step({ id: "ask", rated: profile.read.length, excluded: profile.excludedTitles.length });
      const raw =
        body.type === "recommend"
          ? await getBookRecommendations(profile, 5)
          : await chatAboutBooks(message, profile, history);

      step({ id: "verify", count: raw.recommendations.length, source: "books" });
      const filtered = await filterBookToCount(raw, excluded, profile.excludedTitles, count);
      return { response: bookResponseToGeneric(filtered), media: "book" };
    }

    const profile = await buildMovieProfile(userId, locale);
    const excluded = new Set(profile.excludedTmdbIds);

    step({ id: "ask", rated: profile.watched.length, excluded: profile.excludedTitles.length });
    const raw =
      body.type === "recommend"
        ? await getRecommendations(profile, MOVIE_PICKS)
        : await chatAboutMovies(message, profile, history, MOVIE_PICKS);

    step({ id: "verify", count: raw.recommendations.length, source: "tmdb" });
    const response = await filterToCount(raw, excluded, profile.excludedTitles, MOVIE_PICKS);
    return { response, media: "movie" };
  });
}
