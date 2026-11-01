"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { BookDecisionButtons } from "@/components/decision-buttons";
import { Button } from "@/components/ui/button";
import { RatingDialog } from "@/components/rating-dialog";
import { ReportBookDialog } from "@/components/report-book-dialog";
import { saveBookAction, undoBookAction, recordSeenBookAction } from "@/lib/actions";
import type { BookCardSummary } from "@/lib/book-card";
import { BookCardView } from "@/components/book-card-view";
import type { GoogleBookListItem } from "@/lib/google-books";
import { useSwipeQueue } from "@/lib/use-swipe-queue";

async function fetchCardSummary(volumeId: string): Promise<BookCardSummary | null> {
  const res = await fetch(`/api/books/${encodeURIComponent(volumeId)}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.card ?? null;
}

export function BookSwipeDeck({ locale }: { locale: string }) {
  const t = useTranslations("bookSwipe");
  const tCommon = useTranslations("common");
  const [ratingBook, setRatingBook] = useState<GoogleBookListItem | null>(null);
  const [reportVolumeId, setReportVolumeId] = useState<string | null>(null);

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
  } = useSwipeQueue<GoogleBookListItem, string, BookCardSummary>({
    queueUrl: `/api/books/queue?locale=${locale}`,
    readQueue: (data) => (data as { books?: GoogleBookListItem[] }).books ?? [],
    fetchCard: fetchCardSummary,
    cardImage: (card) => card.cover,
    recordSeen: recordSeenBookAction,
    undoSave: (id) => undoBookAction(id, { skipRevalidate: true }),
    errorText: tCommon("error"),
  });

  const handleWant = () => {
    if (!current || !currentCard) return;
    commit(current, index, () =>
      saveBookAction({ googleVolumeId: current.id, status: "WANT", skipRevalidate: true }),
    );
  };

  const handleSkip = () => {
    if (!current || !currentCard) return;
    commit(current, index, () =>
      saveBookAction({ googleVolumeId: current.id, status: "SKIPPED", skipRevalidate: true }),
    );
  };

  const handleNotInterested = () => {
    if (!current || !currentCard) return;
    commit(current, index, () =>
      saveBookAction({
        googleVolumeId: current.id,
        status: "NOT_INTERESTED",
        skipRevalidate: true,
      }),
    );
  };

  const handleRead = () => {
    if (!current || !currentCard) return;
    setRatingBook(current);
  };

  const handleRatingSave = async (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => {
    if (!ratingBook) return;
    const book = ratingBook;
    setRatingBook(null);
    commit(book, index, () =>
      saveBookAction({
        googleVolumeId: book.id,
        status: "READ",
        skipRevalidate: true,
        ...data,
      }),
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
      <div className="relative mx-auto w-full max-w-2xl rounded-2xl border border-border/50 bg-card shadow-2xl">
        <AnimatePresence mode="wait" initial={false}>
          {currentCard ? (
            <BookSwipeCard
              key={current.id}
              card={currentCard}
              locale={locale}
              onReport={() => setReportVolumeId(current.id)}
            />
          ) : (
            <BookCardSkeleton key={`loading-${current.id}`} />
          )}
        </AnimatePresence>
        {/* Rozhodnutí patří ke kartě: jeden rámeček, lišta je její spodek a na mobilu drží u okraje. */}
        <div className="sticky bottom-20 z-10 rounded-b-2xl border-t border-border/50 bg-card/95 p-3 backdrop-blur-sm">
          {/* Pořadí a význam tlačítek drží BookDecisionButtons, stejné ve všech pohledech. */}
          <BookDecisionButtons
            variant="bar"
            disabled={actionsDisabled}
            onDecide={(d) =>
              d === "WANT" ? handleWant() : d === "READ" ? handleRead() : d === "NOT_INTERESTED" ? handleNotInterested() : handleSkip()
            }
          />
        </div>
      </div>

      {undo && (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="gap-2">
            <Undo2 className="h-4 w-4" />
            {t("undo")}
          </Button>
        </div>
      )}

      <RatingDialog
        open={!!ratingBook}
        onOpenChange={(open) => !open && setRatingBook(null)}
        onSave={handleRatingSave}
      />

      {reportVolumeId != null && (
        <ReportBookDialog
          googleVolumeId={reportVolumeId}
          open={reportVolumeId != null}
          onOpenChange={(open) => !open && setReportVolumeId(null)}
          onReported={() => refreshCard(reportVolumeId)}
        />
      )}
    </>
  );
}

function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-t-2xl animate-pulse">
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 items-center justify-center bg-muted/40 p-3 sm:w-44 md:w-52">
          <div className="aspect-[2/3] w-full max-w-[160px] rounded-lg bg-muted sm:max-w-none" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="h-7 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function BookSwipeCard({
  card,
  locale,
  onReport,
}: {
  card: BookCardSummary;
  locale: string;
  onReport: () => void;
}) {
  return (
    <motion.div
      className="overflow-hidden rounded-t-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <BookCardView card={card} level="card" locale={locale} onReport={onReport} priority />
    </motion.div>
  );
}
