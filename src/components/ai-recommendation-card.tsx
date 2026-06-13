"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EyeOff, Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingDialog } from "@/components/rating-dialog";
import { saveMovieAction } from "@/lib/actions";
import type { AiMovieRecommendation } from "@/lib/ai";
import type { TmdbMovieListItem } from "@/lib/tmdb";

type MovieStatus = "WATCHED" | "WANT" | "SKIPPED";

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

async function resolveTmdbId(title: string, year: number): Promise<number | null> {
  const queries = [cleanTitle(title, year), title.trim()].filter(
    (q, i, arr) => q && arr.indexOf(q) === i,
  );

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
  const t = useTranslations("swipe");
  const tAi = useTranslations("ai");
  const [tmdbId, setTmdbId] = useState<number | null>(null);
  const [status, setStatus] = useState<MovieStatus | null>(null);
  const [resolving, setResolving] = useState(true);
  const [acting, setActing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingTmdbId, setRatingTmdbId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      setNotFound(false);
      const id = await resolveTmdbId(rec.title, rec.year);
      if (cancelled) return;
      setTmdbId(id);
      setNotFound(!id);
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [rec.title, rec.year]);

  const ensureId = useCallback(async () => {
    if (tmdbId) return tmdbId;
    setResolving(true);
    const id = await resolveTmdbId(rec.title, rec.year);
    setTmdbId(id);
    setNotFound(!id);
    setResolving(false);
    return id;
  }, [rec.title, rec.year, tmdbId]);

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

  const handleSkip = () => applyStatus("SKIPPED");
  const handleWant = () => applyStatus("WANT");
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

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <Button
            variant={status === "SKIPPED" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="h-auto flex-col gap-0.5 px-1 py-2 text-[10px] sm:text-xs"
            onClick={handleSkip}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {t("skip")}
          </Button>
          <Button
            variant={status === "WATCHED" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="h-auto flex-col gap-0.5 px-1 py-2 text-[10px] sm:text-xs"
            onClick={handleWatched}
          >
            <Star className="h-3.5 w-3.5" />
            {t("watched")}
          </Button>
          <Button
            variant={status === "WANT" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="h-auto flex-col gap-0.5 px-1 py-2 text-[10px] sm:text-xs"
            onClick={handleWant}
          >
            <Heart className="h-3.5 w-3.5" />
            {t("want")}
          </Button>
        </div>
      </div>

      <RatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        onSave={handleRatingSave}
      />
    </>
  );
}
