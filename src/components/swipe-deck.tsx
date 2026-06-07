"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Heart, Flag, Star, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingDialog } from "@/components/rating-dialog";
import { ReportDataDialog } from "@/components/report-data-dialog";
import { saveMovieAction, undoMovieAction, recordSeenMovieAction } from "@/lib/actions";
import type { MovieCardSummary } from "@/lib/movie-card";
import type { TmdbMovieListItem } from "@/lib/tmdb";

type UndoState = {
  index: number;
  movie: TmdbMovieListItem;
};

async function fetchCardSummary(tmdbId: number): Promise<MovieCardSummary | null> {
  const res = await fetch(`/api/movies/${tmdbId}`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.card ?? null;
}

export function SwipeDeck({ locale }: { locale: string }) {
  const t = useTranslations("swipe");
  const tCommon = useTranslations("common");
  const [movies, setMovies] = useState<TmdbMovieListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [ratingMovie, setRatingMovie] = useState<TmdbMovieListItem | null>(null);
  const [reportTmdbId, setReportTmdbId] = useState<number | null>(null);
  const [cardCache, setCardCache] = useState<Map<number, MovieCardSummary>>(new Map());
  const [cardLoading, setCardLoading] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCardCache(new Map());
    try {
      const res = await fetch("/api/movies/queue", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setMovies([]);
        return;
      }
      setMovies(data.movies ?? []);
      setIndex(0);
      setUndo(null);
    } catch {
      setError(tCommon("error"));
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const current = movies[index];
  const currentCard = current ? cardCache.get(current.id) : null;

  const cacheCard = useCallback((id: number, card: MovieCardSummary) => {
    setCardCache((prev) => {
      const next = new Map(prev);
      next.set(id, card);
      return next;
    });
  }, []);

  const refreshCard = useCallback(
    async (tmdbId: number) => {
      setCardCache((prev) => {
        const next = new Map(prev);
        next.delete(tmdbId);
        return next;
      });
      const card = await fetchCardSummary(tmdbId);
      if (card) cacheCard(tmdbId, card);
    },
    [cacheCard],
  );

  const ensureCard = useCallback(
    async (tmdbId: number) => {
      const card = await fetchCardSummary(tmdbId);
      if (card) cacheCard(tmdbId, card);
    },
    [cacheCard],
  );

  useEffect(() => {
    if (!current) return;
    let cancelled = false;

    (async () => {
      setCardLoading(true);
      await ensureCard(current.id);
      if (cancelled) return;
      setCardLoading(false);

      const next = movies[index + 1];
      if (next) await ensureCard(next.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id, index, movies, ensureCard]);

  useEffect(() => {
    if (!current?.id || !currentCard) return;
    void recordSeenMovieAction(current.id);
  }, [current?.id, currentCard]);

  const scheduleUndo = (state: UndoState) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(state);
    undoTimer.current = setTimeout(() => setUndo(null), 12_000);
  };

  const advance = (movie: TmdbMovieListItem) => {
    scheduleUndo({ index, movie });
    setIndex((i) => i + 1);
  };

  const handleUndo = async () => {
    if (!undo) return;
    await undoMovieAction(undo.movie.id);
    setIndex(undo.index);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const handleWant = async () => {
    if (!current || !currentCard) return;
    await saveMovieAction({ tmdbId: current.id, status: "WANT" });
    advance(current);
  };

  const handleSkip = async () => {
    if (!current || !currentCard) return;
    await saveMovieAction({ tmdbId: current.id, status: "SKIPPED" });
    advance(current);
  };

  const handleWatched = () => {
    if (!current || !currentCard) return;
    setRatingMovie(current);
  };

  const handleRatingSave = async (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => {
    if (!ratingMovie) return;
    await saveMovieAction({
      tmdbId: ratingMovie.id,
      status: "WATCHED",
      ...data,
    });
    setRatingMovie(null);
    advance(ratingMovie);
  };

  const actionsDisabled = !currentCard || cardLoading;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        {tCommon("loading")}
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{error ?? t("noMore")}</p>
        <Button onClick={loadQueue} variant="outline">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto w-full max-w-2xl flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {currentCard ? (
            <SwipeCard
              key={current.id}
              card={currentCard}
              locale={locale}
              onReport={() => setReportTmdbId(current.id)}
            />
          ) : (
            <CardSkeleton key={`loading-${current.id}`} />
          )}
        </AnimatePresence>
      </div>

      {undo && (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="gap-2">
            <Undo2 className="h-4 w-4" />
            {t("undo")}
          </Button>
        </div>
      )}

      <div className="sticky bottom-20 z-10 mt-4 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            disabled={actionsDisabled}
            className="h-auto flex-col gap-1 py-3 text-destructive hover:text-destructive"
            onClick={handleSkip}
          >
            <EyeOff className="h-5 w-5" />
            <span className="text-xs font-medium">{t("skip")}</span>
          </Button>
          <Button
            disabled={actionsDisabled}
            className="h-auto flex-col gap-1 bg-emerald-600 py-3 hover:bg-emerald-500"
            onClick={handleWatched}
          >
            <Star className="h-5 w-5 fill-current" />
            <span className="text-xs font-medium">{t("watched")}</span>
          </Button>
          <Button
            variant="outline"
            disabled={actionsDisabled}
            className="h-auto flex-col gap-1 text-pink-400 hover:text-pink-300"
            onClick={handleWant}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs font-medium">{t("want")}</span>
          </Button>
        </div>
      </div>

      <RatingDialog
        open={!!ratingMovie}
        onOpenChange={(open) => !open && setRatingMovie(null)}
        onSave={handleRatingSave}
      />

      {reportTmdbId != null && (
        <ReportDataDialog
          tmdbId={reportTmdbId}
          open={reportTmdbId != null}
          onOpenChange={(open) => !open && setReportTmdbId(null)}
          onReported={() => refreshCard(reportTmdbId)}
        />
      )}
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl animate-pulse">
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 items-center justify-center bg-muted/40 p-3 sm:w-44 md:w-52">
          <div className="aspect-[2/3] w-full max-w-[160px] rounded-lg bg-muted sm:max-w-none" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="h-7 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function SwipeCard({
  card,
  locale,
  onReport,
}: {
  card: MovieCardSummary;
  locale: string;
  onReport: () => void;
}) {
  const t = useTranslations("movie");
  const tReport = useTranslations("report");

  return (
    <motion.div
      className="rounded-2xl border border-border/50 bg-card shadow-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start">
        <Link
          href={`/${locale}/movie/${card.tmdbId}`}
          className="relative flex shrink-0 items-center justify-center bg-muted/40 p-3 sm:w-40 md:w-44"
        >
          <div className="relative aspect-[2/3] w-full max-w-[140px] sm:max-w-none sm:w-full">
            {card.poster ? (
              <Image
                src={card.poster}
                alt={card.czechTitle}
                fill
                className="rounded-lg object-contain"
                priority
                unoptimized={card.poster.includes("pmgstatic.com")}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No poster
              </div>
            )}
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/${locale}/movie/${card.tmdbId}`} className="min-w-0 flex-1">
              <h2 className="text-xl font-bold leading-snug sm:text-2xl">{card.czechTitle}</h2>
              {card.originalTitle !== card.czechTitle && (
                <p className="mt-1 text-sm text-muted-foreground">{card.originalTitle}</p>
              )}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-xs text-muted-foreground"
              onClick={onReport}
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tReport("button")}</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {card.year && <span className="text-sm text-muted-foreground">{card.year}</span>}
            {card.runtime && (
              <span className="text-sm text-muted-foreground">{card.runtime} min</span>
            )}
            <Badge variant="secondary" className="text-xs">
              IMDb {card.voteAverage.toFixed(1)}
            </Badge>
            {card.csfdRating != null && (
              <Badge variant="outline" className="text-xs">
                ČSFD {card.csfdRating}%
              </Badge>
            )}
          </div>

          {card.overview ? (
            <div className="text-sm">
              <span className="font-medium text-foreground">{t("overview")}: </span>
              <p className="mt-1 leading-relaxed text-muted-foreground">{card.overview}</p>
            </div>
          ) : null}

          {card.directors.length > 0 && (
            <p className="text-sm">
              <span className="font-medium text-foreground">{t("director")}: </span>
              <span className="text-muted-foreground">{card.directors.join(", ")}</span>
            </p>
          )}

          {card.writers.length > 0 && (
            <p className="text-sm">
              <span className="font-medium text-foreground">{t("writer")}: </span>
              <span className="text-muted-foreground">{card.writers.join(", ")}</span>
            </p>
          )}

          {card.composers.length > 0 && (
            <p className="text-sm">
              <span className="font-medium text-foreground">{t("composer")}: </span>
              <span className="text-muted-foreground">{card.composers.join(", ")}</span>
            </p>
          )}

          {card.cast.length > 0 && (
            <p className="text-sm">
              <span className="font-medium text-foreground">{t("cast")}: </span>
              <span className="text-muted-foreground">{card.cast.join(", ")}</span>
            </p>
          )}

          <Link
            href={`/${locale}/movie/${card.tmdbId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Eye className="h-3.5 w-3.5" />
            {t("detailLink")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
