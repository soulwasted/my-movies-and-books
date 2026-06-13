"use server";

import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { normalizeToScale } from "@/lib/rating";
import { MovieStatus, BookStatus, RatingType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function saveMovieAction(input: {
  tmdbId: number;
  status: "WATCHED" | "WANT" | "SKIPPED";
  rating?: number;
  ratingType?: "STARS" | "SCALE";
  notes?: string;
  tags?: string[];
}) {
  const userId = await requireUserId();

  const scale =
    input.rating != null ? normalizeToScale(input.rating, input.ratingType) : null;

  const data = {
    status: input.status as MovieStatus,
    rating: scale,
    ratingType: input.ratingType ? (input.ratingType as RatingType) : null,
    notes: input.notes ?? null,
    tags: JSON.stringify(input.tags ?? []),
    watchedAt: input.status === "WATCHED" ? new Date() : null,
  };

  await prisma.userMovie.upsert({
    where: {
      userId_tmdbId: { userId, tmdbId: input.tmdbId },
    },
    create: { userId, tmdbId: input.tmdbId, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/library");
}

/** Zaznamená film zobrazený ve swipe frontě (bez přepsání rozhodnutí uživatele). */
export async function recordSeenMovieAction(tmdbId: number) {
  const userId = await requireUserId();
  const existing = await prisma.userMovie.findUnique({
    where: { userId_tmdbId: { userId, tmdbId } },
  });
  if (existing) return;
  await prisma.userMovie.create({
    data: { userId, tmdbId, status: "SEEN" },
  });
}

export async function undoMovieAction(tmdbId: number) {
  const userId = await requireUserId();
  await prisma.userMovie.deleteMany({
    where: { userId, tmdbId },
  });
  revalidatePath("/");
  revalidatePath("/library");
}

export async function reportMovieDataAction(input: {
  tmdbId: number;
  reason: "wrong_description" | "wrong_title" | "wrong_people" | "other";
  note?: string;
}) {
  const userId = await requireUserId();

  await prisma.movieDataReport.create({
    data: {
      userId,
      tmdbId: input.tmdbId,
      reason: input.reason,
      note: input.note?.trim() || null,
    },
  });

  const cached = await prisma.movieCache.findUnique({ where: { tmdbId: input.tmdbId } });
  const rejectedIds: number[] = cached?.rejectedCzdbIds
    ? JSON.parse(cached.rejectedCzdbIds)
    : [];

  if (cached?.czdbId && !rejectedIds.includes(cached.czdbId)) {
    rejectedIds.push(cached.czdbId);
  }

  if (cached) {
    await prisma.movieCache.update({
      where: { tmdbId: input.tmdbId },
      data: {
        czdbId: null,
        czdbData: null,
        csfdRating: null,
        csfdUrl: null,
        rejectedCzdbIds: JSON.stringify(rejectedIds),
        csfdUpdated: new Date(0),
      },
    });
  }

  return { ok: true };
}

export async function savePreferencesAction(input: {
  favoriteGenreIds?: number[];
  favoriteBookCategoryIds?: string[];
  locale?: string;
  onboardingComplete?: boolean;
}) {
  const userId = await requireUserId();

  const existing = await prisma.userPreferences.findUnique({ where: { userId } });

  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      favoriteGenreIds: JSON.stringify(input.favoriteGenreIds ?? []),
      favoriteBookCategoryIds: JSON.stringify(input.favoriteBookCategoryIds ?? []),
      locale: input.locale ?? "cs",
      onboardingComplete: input.onboardingComplete ?? true,
    },
    update: {
      ...(input.favoriteGenreIds !== undefined && {
        favoriteGenreIds: JSON.stringify(input.favoriteGenreIds),
      }),
      ...(input.favoriteBookCategoryIds !== undefined && {
        favoriteBookCategoryIds: JSON.stringify(input.favoriteBookCategoryIds),
      }),
      ...(input.locale && { locale: input.locale }),
      ...(input.onboardingComplete !== undefined && {
        onboardingComplete: input.onboardingComplete,
      }),
      ...(existing && input.favoriteGenreIds === undefined && {
        favoriteGenreIds: existing.favoriteGenreIds,
      }),
      ...(existing && input.favoriteBookCategoryIds === undefined && {
        favoriteBookCategoryIds: existing.favoriteBookCategoryIds,
      }),
    },
  });

  revalidatePath("/");
  revalidatePath("/library");
}

export async function getUserStats() {
  const userId = await requireUserId();

  const [watched, want, ratings, read, wantBooks, bookRatings] = await Promise.all([
    prisma.userMovie.count({
      where: { userId, status: "WATCHED" },
    }),
    prisma.userMovie.count({
      where: { userId, status: "WANT" },
    }),
    prisma.userMovie.findMany({
      where: { userId, status: "WATCHED", rating: { not: null } },
      select: { rating: true, ratingType: true },
    }),
    prisma.userBook.count({
      where: { userId, status: "READ" },
    }),
    prisma.userBook.count({
      where: { userId, status: "WANT" },
    }),
    prisma.userBook.findMany({
      where: { userId, status: "READ", rating: { not: null } },
      select: { rating: true, ratingType: true },
    }),
  ]);

  const avgRating =
    ratings.length > 0
      ? ratings.reduce(
          (s, r) => s + normalizeToScale(r.rating ?? 0, r.ratingType),
          0,
        ) / ratings.length
      : null;

  const avgBookRating =
    bookRatings.length > 0
      ? bookRatings.reduce(
          (s, r) => s + normalizeToScale(r.rating ?? 0, r.ratingType),
          0,
        ) / bookRatings.length
      : null;

  return {
    watched,
    want,
    avgRating,
    books: {
      read,
      want: wantBooks,
      avgRating: avgBookRating,
    },
  };
}

export async function saveBookAction(input: {
  googleVolumeId: string;
  status: "READ" | "WANT" | "SKIPPED";
  rating?: number;
  ratingType?: "STARS" | "SCALE";
  notes?: string;
  tags?: string[];
}) {
  const userId = await requireUserId();

  const scale =
    input.rating != null ? normalizeToScale(input.rating, input.ratingType) : null;

  const data = {
    status: input.status as BookStatus,
    rating: scale,
    ratingType: input.ratingType ? (input.ratingType as RatingType) : null,
    notes: input.notes ?? null,
    tags: JSON.stringify(input.tags ?? []),
    readAt: input.status === "READ" ? new Date() : null,
  };

  await prisma.userBook.upsert({
    where: {
      userId_googleVolumeId: { userId, googleVolumeId: input.googleVolumeId },
    },
    create: { userId, googleVolumeId: input.googleVolumeId, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/library");
}

export async function recordSeenBookAction(googleVolumeId: string) {
  const userId = await requireUserId();
  const existing = await prisma.userBook.findUnique({
    where: { userId_googleVolumeId: { userId, googleVolumeId } },
  });
  if (existing) return;
  await prisma.userBook.create({
    data: { userId, googleVolumeId, status: "SEEN" },
  });
}

export async function undoBookAction(googleVolumeId: string) {
  const userId = await requireUserId();
  await prisma.userBook.deleteMany({
    where: { userId, googleVolumeId },
  });
  revalidatePath("/");
  revalidatePath("/library");
}

export async function reportBookDataAction(input: {
  googleVolumeId: string;
  reason: "wrong_description" | "wrong_title" | "wrong_author" | "other";
  note?: string;
}) {
  const userId = await requireUserId();

  await prisma.bookDataReport.create({
    data: {
      userId,
      googleVolumeId: input.googleVolumeId,
      reason: input.reason,
      note: input.note?.trim() || null,
    },
  });

  const cached = await prisma.bookCache.findUnique({
    where: { googleVolumeId: input.googleVolumeId },
  });
  const rejectedIds: string[] = cached?.rejectedOlIds
    ? JSON.parse(cached.rejectedOlIds)
    : [];

  if (cached?.openLibraryId && !rejectedIds.includes(cached.openLibraryId)) {
    rejectedIds.push(cached.openLibraryId);
  }

  if (cached) {
    await prisma.bookCache.update({
      where: { googleVolumeId: input.googleVolumeId },
      data: {
        openLibraryId: null,
        enrichmentData: null,
        czechTitle: null,
        wikidataId: null,
        databazeKnihUrl: null,
        rejectedOlIds: JSON.stringify(rejectedIds),
        enrichedAt: new Date(0),
      },
    });
  }

  return { ok: true };
}
