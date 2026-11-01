"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { MovieDecisionButtons } from "@/components/decision-buttons";
import { Button } from "@/components/ui/button";
import { RatingDialog } from "@/components/rating-dialog";
import { ReportDataDialog } from "@/components/report-data-dialog";
import { saveMovieAction, undoMovieAction, recordSeenMovieAction } from "@/lib/actions";
import type { MovieCardSummary } from "@/lib/movie-card";
import type { TmdbMovieListItem } from "@/lib/tmdb";
import { useSwipeQueue } from "@/lib/use-swipe-queue";
import type { QueueMovie, QueueReason } from "@/lib/queue-types";
import { MovieCardView } from "@/components/movie-card-view";

async function fetchCardSummary(tmdbId: number): Promise<MovieCardSummary | null> {
  const res = await fetch(`/api/movies/${tmdbId}`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.card ?? null;
}

export function SwipeDeck({ locale }: { locale: string }) {
  const t = useTranslations("swipe");
  const tCommon = useTranslations("common");
  const [ratingMovie, setRatingMovie] = useState<TmdbMovieListItem | null>(null);
  const [reportTmdbId, setReportTmdbId] = useState<number | null>(null);

  const {
    loading,
    error,
    index,
    current,
    currentCard,
    undo,
    reload,
    refreshCard,
    commit,
    handleUndo,
  } = useSwipeQueue<QueueMovie, number, MovieCardSummary>({
    queueUrl: "/api/movies/queue",
    readQueue: (data) => (data as { movies?: QueueMovie[] }).movies ?? [],
    fetchCard: fetchCardSummary,
    cardImage: (card) => card.poster,
    recordSeen: recordSeenMovieAction,
    undoSave: (id) => undoMovieAction(id, { skipRevalidate: true }),
    errorText: tCommon("error"),
  });

  const handleWant = () => {
    if (!current || !currentCard) return;
    commit(current, index, () =>
      saveMovieAction({ tmdbId: current.id, status: "WANT", skipRevalidate: true }),
    );
  };

  const handleSkip = () => {
    if (!current || !currentCard) return;
    commit(current, index, () =>
      saveMovieAction({ tmdbId: current.id, status: "SKIPPED", skipRevalidate: true }),
    );
  };

  const handleNotInterested = () => {
    if (!current || !currentCard) return;
    commit(current, index, () =>
      saveMovieAction({ tmdbId: current.id, status: "NOT_INTERESTED", skipRevalidate: true }),
    );
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
    const movie = ratingMovie;
    setRatingMovie(null);
    commit(movie, index, () =>
      saveMovieAction({ tmdbId: movie.id, status: "WATCHED", skipRevalidate: true, ...data }),
    );
  };

  const actionsDisabled = !currentCard;

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
        <Button onClick={reload} variant="outline">
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
              reason={current.reason}
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
        {/* Pořadí a význam tlačítek drží MovieDecisionButtons, stejné ve všech pohledech. */}
        <MovieDecisionButtons
          variant="bar"
          disabled={actionsDisabled}
          onDecide={(d) =>
            d === "WANT" ? handleWant() : d === "WATCHED" ? handleWatched() : d === "NOT_INTERESTED" ? handleNotInterested() : handleSkip()
          }
        />
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
  reason,
  locale,
  onReport,
}: {
  card: MovieCardSummary;
  reason?: QueueReason;
  locale: string;
  onReport: () => void;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-border/50 bg-card shadow-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <MovieCardView card={card} reason={reason} locale={locale} onReport={onReport} priority />
    </motion.div>
  );
}
