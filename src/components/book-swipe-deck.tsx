"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, EyeOff, Heart, Flag, Star, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingDialog } from "@/components/rating-dialog";
import { ReportBookDialog } from "@/components/report-book-dialog";
import { saveBookAction, undoBookAction, recordSeenBookAction } from "@/lib/actions";
import type { BookCardSummary } from "@/lib/book-card";
import type { GoogleBookListItem } from "@/lib/google-books";

type UndoState = {
  index: number;
  book: GoogleBookListItem;
};

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
  const [books, setBooks] = useState<GoogleBookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [ratingBook, setRatingBook] = useState<GoogleBookListItem | null>(null);
  const [reportVolumeId, setReportVolumeId] = useState<string | null>(null);
  const [cardCache, setCardCache] = useState<Map<string, BookCardSummary>>(new Map());
  const [cardLoading, setCardLoading] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCardCache(new Map());
    try {
      const res = await fetch(`/api/books/queue?locale=${locale}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setBooks([]);
        return;
      }
      setBooks(data.books ?? []);
      setIndex(0);
      setUndo(null);
    } catch {
      setError(tCommon("error"));
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [tCommon, locale]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const current = books[index];
  const currentCard = current ? cardCache.get(current.id) : null;

  const cacheCard = useCallback((id: string, card: BookCardSummary) => {
    setCardCache((prev) => {
      const next = new Map(prev);
      next.set(id, card);
      return next;
    });
  }, []);

  const refreshCard = useCallback(
    async (volumeId: string) => {
      setCardCache((prev) => {
        const next = new Map(prev);
        next.delete(volumeId);
        return next;
      });
      const card = await fetchCardSummary(volumeId);
      if (card) cacheCard(volumeId, card);
    },
    [cacheCard],
  );

  const ensureCard = useCallback(
    async (volumeId: string) => {
      const card = await fetchCardSummary(volumeId);
      if (card) cacheCard(volumeId, card);
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

      const next = books[index + 1];
      if (next) await ensureCard(next.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id, index, books, ensureCard]);

  useEffect(() => {
    if (!current?.id || !currentCard) return;
    void recordSeenBookAction(current.id);
  }, [current?.id, currentCard]);

  const scheduleUndo = (state: UndoState) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(state);
    undoTimer.current = setTimeout(() => setUndo(null), 12_000);
  };

  const advance = (book: GoogleBookListItem) => {
    scheduleUndo({ index, book });
    setIndex((i) => i + 1);
  };

  const handleUndo = async () => {
    if (!undo) return;
    await undoBookAction(undo.book.id);
    setIndex(undo.index);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const handleWant = async () => {
    if (!current || !currentCard) return;
    await saveBookAction({ googleVolumeId: current.id, status: "WANT" });
    advance(current);
  };

  const handleSkip = async () => {
    if (!current || !currentCard) return;
    await saveBookAction({ googleVolumeId: current.id, status: "SKIPPED" });
    advance(current);
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
    await saveBookAction({
      googleVolumeId: ratingBook.id,
      status: "READ",
      ...data,
    });
    setRatingBook(null);
    advance(ratingBook);
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
            onClick={handleRead}
          >
            <Star className="h-5 w-5 fill-current" />
            <span className="text-xs font-medium">{t("read")}</span>
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
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl animate-pulse">
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
  const t = useTranslations("book");
  const tReport = useTranslations("bookReport");

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
          href={`/${locale}/book/${encodeURIComponent(card.googleVolumeId)}`}
          className="relative flex shrink-0 items-center justify-center bg-muted/40 p-3 sm:w-40 md:w-44"
        >
          <div className="relative aspect-[2/3] w-full max-w-[140px] sm:max-w-none sm:w-full">
            {card.cover ? (
              <Image
                src={card.cover}
                alt={card.title}
                fill
                className="rounded-lg object-contain"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No cover
              </div>
            )}
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/${locale}/book/${encodeURIComponent(card.googleVolumeId)}`}
              className="min-w-0 flex-1"
            >
              <h2 className="text-xl font-bold leading-snug sm:text-2xl">{card.title}</h2>
              {card.authors.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">{card.authors.join(", ")}</p>
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
            {card.pageCount && (
              <span className="text-sm text-muted-foreground">{card.pageCount} {t("pages")}</span>
            )}
            {card.averageRating != null && (
              <Badge variant="secondary" className="text-xs">
                ★ {card.averageRating.toFixed(1)}
              </Badge>
            )}
          </div>

          {card.overview ? (
            <div className="text-sm">
              <span className="font-medium text-foreground">{t("overview")}: </span>
              <p className="mt-1 line-clamp-4 leading-relaxed text-muted-foreground">
                {card.overview}
              </p>
            </div>
          ) : null}

          {card.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.categories.slice(0, 3).map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          )}

          <Link
            href={`/${locale}/book/${encodeURIComponent(card.googleVolumeId)}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t("detailLink")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
