"use server";

import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { MovieStatus, RatingType } from "@prisma/client";
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

  const data = {
    status: input.status as MovieStatus,
    rating: input.rating ?? null,
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
  favoriteGenreIds: number[];
  locale?: string;
  onboardingComplete?: boolean;
}) {
  const userId = await requireUserId();

  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      favoriteGenreIds: JSON.stringify(input.favoriteGenreIds),
      locale: input.locale ?? "cs",
      onboardingComplete: input.onboardingComplete ?? true,
    },
    update: {
      favoriteGenreIds: JSON.stringify(input.favoriteGenreIds),
      ...(input.locale && { locale: input.locale }),
      ...(input.onboardingComplete !== undefined && {
        onboardingComplete: input.onboardingComplete,
      }),
    },
  });

  revalidatePath("/");
  revalidatePath("/library");
}

export async function getUserStats() {
  const userId = await requireUserId();

  const [watched, want, ratings] = await Promise.all([
    prisma.userMovie.count({
      where: { userId, status: "WATCHED" },
    }),
    prisma.userMovie.count({
      where: { userId, status: "WANT" },
    }),
    prisma.userMovie.findMany({
      where: { userId, status: "WATCHED", rating: { not: null } },
      select: { rating: true },
    }),
  ]);

  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + (r.rating ?? 0), 0) / ratings.length
      : null;

  return { watched, want, avgRating };
}
