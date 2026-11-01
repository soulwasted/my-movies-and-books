"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { RatingDialog } from "@/components/rating-dialog";
import { saveMovieAction } from "@/lib/actions";
import type { AiMovieRecommendation } from "@/lib/ai";
import type { TmdbMovieListItem } from "@/lib/tmdb";
import type { MovieCardSummary } from "@/lib/movie-card";
import { MovieCardView } from "@/components/movie-card-view";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDecisionButtons, type MovieDecision } from "@/components/decision-buttons";

type MovieStatus = MovieDecision;

function pickBestMatch(results: TmdbMovieListItem[], year: number): TmdbMovieListItem | null {
  if (results.length === 0) return null;
  const byYear = results.find((r) => r.release_date?.startsWith(String(year)));
  if (byYear) return byYear;
  const nearYear = results.find((r) => {
    const y = parseInt(r.release_date?.slice(0, 4) ?? "0", 10);
    return y && Math.abs(y - year) <= 1;
  });
  return nearYear ?? results[0];
}

function cleanTitle(title: string, year: number): string {
  return title
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .replace(new RegExp(`\\s*${year}\\s*$`), "")
    .trim();
}

async function resolveTmdbId(title: string, year: number, originalTitle?: string): Promise<number | null> {
  const queries = [originalTitle, title]
    .flatMap((t) => (t ? [cleanTitle(t, year), t.trim()] : []))
    .filter((q, i, arr) => q && arr.indexOf(q) === i);

  for (const query of queries) {
    const params = new URLSearchParams({ q: query, year: String(year) });
    const res = await fetch(`/api/movies/search?${params}`, { credentials: "include" });
    if (!res.ok) continue;
    const data = await res.json();
    const match = pickBestMatch(data.results ?? [], year);
    if (match) return match.id;
  }

  // Fallback: title only without year filter
  for (const query of queries) {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`/api/movies/search?${params}`, { credentials: "include" });
    if (!res.ok) continue;
    const data = await res.json();
    const match = pickBestMatch(data.results ?? [], year);
    if (match) return match.id;
  }

  return null;
}

export function AiRecommendationCard({
  rec,
  locale,
}: {
  rec: AiMovieRecommendation;
  locale: string;
}) {
  const tAi = useTranslations("ai");
  const [tmdbId, setTmdbId] = useState<number | null>(rec.tmdbId ?? null);
  const [status, setStatus] = useState<MovieStatus | null>(null);
  const [resolving, setResolving] = useState(!rec.tmdbId);
  const [acting, setActing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingTmdbId, setRatingTmdbId] = useState<number | null>(null);
  const [card, setCard] = useState<MovieCardSummary | null>(null);
  const [cardFailed, setCardFailed] = useState(false);

  useEffect(() => {
    // Server už film dohledal při filtrování, není co řešit.
    if (rec.tmdbId) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      setNotFound(false);
      const id = await resolveTmdbId(rec.title, rec.year, rec.originalTitle);
      if (cancelled) return;
      setTmdbId(id);
      setNotFound(!id);
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [rec.title, rec.year, rec.originalTitle, rec.tmdbId]);

  // Stejná data jako karta ve swipe frontě (plakát, hodnocení, tvůrci, popis).
  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    fetch(`/api/movies/${tmdbId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.card) setCard(data.card as MovieCardSummary);
        else setCardFailed(true);
      })
      .catch(() => !cancelled && setCardFailed(true));
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  const ensureId = useCallback(async () => {
    if (tmdbId) return tmdbId;
    setResolving(true);
    const id = await resolveTmdbId(rec.title, rec.year, rec.originalTitle);
    setTmdbId(id);
    setNotFound(!id);
    setResolving(false);
    return id;
  }, [rec.title, rec.year, rec.originalTitle, tmdbId]);

  const applyStatus = async (newStatus: MovieStatus) => {
    setActing(true);
    setNotFound(false);
    try {
      const id = await ensureId();
      if (!id) {
        setNotFound(true);
        return;
      }
      await saveMovieAction({ tmdbId: id, status: newStatus });
      setStatus(newStatus);
    } finally {
      setActing(false);
    }
  };

  const handleWatched = async () => {
    setNotFound(false);
    const id = await ensureId();
    if (!id) {
      setNotFound(true);
      return;
    }
    setRatingTmdbId(id);
    setRatingOpen(true);
  };

  const handleRatingSave = async (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => {
    if (!ratingTmdbId) return;
    await saveMovieAction({ tmdbId: ratingTmdbId, status: "WATCHED", ...data });
    setStatus("WATCHED");
    setTmdbId(ratingTmdbId);
    setRatingOpen(false);
  };

  const disabled = resolving || acting;

  const loadingCard = (resolving || !!tmdbId) && !notFound && !cardFailed;

  const actions = (
    <MovieDecisionButtons
      variant="compact"
      status={status}
      disabled={disabled}
      onDecide={(d) => (d === "WATCHED" ? handleWatched() : applyStatus(d))}
      className={card || loadingCard ? "mt-1" : "mt-3"}
    />
  );

  if (card) {
    return (
      <>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <MovieCardView card={card} reason={{ type: "ai", text: rec.reason }} locale={locale} compact>
            {status && (
              <Badge variant="outline" className="w-fit text-[10px] text-emerald-500">
                {tAi("saved")}
              </Badge>
            )}
            {actions}
          </MovieCardView>
        </div>
        <RatingDialog open={ratingOpen} onOpenChange={setRatingOpen} onSave={handleRatingSave} />
      </>
    );
  }

  // Karta se dotahuje: kostra ve tvaru hotové karty, název a důvod od AI už známe.
  if (loadingCard) {
    return (
      <>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card" aria-busy="true">
          <div className="flex gap-3 p-3">
            <Skeleton className="aspect-[2/3] w-20 shrink-0 self-start rounded-md sm:w-24" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h3 className="text-base font-semibold leading-snug text-foreground">{rec.title}</h3>
              <Skeleton className="h-3 w-2/5" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{rec.reason}</p>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              {actions}
            </div>
          </div>
        </div>
        <RatingDialog open={ratingOpen} onOpenChange={setRatingOpen} onSave={handleRatingSave} />
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-background/50 p-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {tmdbId ? (
            <Link
              href={`/${locale}/movie/${tmdbId}`}
              className="font-medium text-foreground hover:underline"
            >
              {rec.title}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{rec.title}</span>
          )}
          <span className="text-xs text-muted-foreground">({rec.year})</span>
          {rec.genre && (
            <Badge variant="secondary" className="text-[10px]">
              {rec.genre}
            </Badge>
          )}
          {status && (
            <Badge variant="outline" className="text-[10px] text-emerald-500">
              {tAi("saved")}
            </Badge>
          )}
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rec.reason}</p>

        {notFound && !resolving && (
          <p className="mt-2 text-xs text-destructive">{tAi("movieNotFound")}</p>
        )}

        {actions}
      </div>

      <RatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        onSave={handleRatingSave}
      />
    </>
  );
}
