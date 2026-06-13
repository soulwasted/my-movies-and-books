"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EyeOff, Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingDialog } from "@/components/rating-dialog";
import { saveBookAction } from "@/lib/actions";
import type { AiMovieRecommendation } from "@/lib/ai";

type BookStatus = "READ" | "WANT" | "SKIPPED";

async function resolveVolumeId(
  title: string,
  author: string,
  year: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: title,
    author,
    year: String(year),
  });
  const res = await fetch(`/api/books/search?${params}`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  const results = data.results ?? [];
  if (results.length === 0) return null;

  const byYear = results.find((r: { publishedDate?: string }) =>
    r.publishedDate?.startsWith(String(year)),
  );
  return (byYear ?? results[0])?.id ?? null;
}

export function AiBookRecommendationCard({
  rec,
  locale,
}: {
  rec: AiMovieRecommendation;
  locale: string;
}) {
  const t = useTranslations("bookSwipe");
  const tAi = useTranslations("ai");
  const author = rec.author ?? "";
  const [volumeId, setVolumeId] = useState<string | null>(null);
  const [status, setStatus] = useState<BookStatus | null>(null);
  const [resolving, setResolving] = useState(true);
  const [acting, setActing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingVolumeId, setRatingVolumeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      setNotFound(false);
      const id = await resolveVolumeId(rec.title, author, rec.year);
      if (cancelled) return;
      setVolumeId(id);
      setNotFound(!id);
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [rec.title, rec.year, author]);

  const ensureId = useCallback(async () => {
    if (volumeId) return volumeId;
    setResolving(true);
    const id = await resolveVolumeId(rec.title, author, rec.year);
    setVolumeId(id);
    setNotFound(!id);
    setResolving(false);
    return id;
  }, [rec.title, rec.year, author, volumeId]);

  const applyStatus = async (newStatus: BookStatus) => {
    setActing(true);
    setNotFound(false);
    try {
      const id = await ensureId();
      if (!id) {
        setNotFound(true);
        return;
      }
      await saveBookAction({ googleVolumeId: id, status: newStatus });
      setStatus(newStatus);
    } finally {
      setActing(false);
    }
  };

  const handleSkip = () => applyStatus("SKIPPED");
  const handleWant = () => applyStatus("WANT");
  const handleRead = async () => {
    setNotFound(false);
    const id = await ensureId();
    if (!id) {
      setNotFound(true);
      return;
    }
    setRatingVolumeId(id);
    setRatingOpen(true);
  };

  const handleRatingSave = async (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => {
    if (!ratingVolumeId) return;
    await saveBookAction({ googleVolumeId: ratingVolumeId, status: "READ", ...data });
    setStatus("READ");
    setVolumeId(ratingVolumeId);
    setRatingOpen(false);
  };

  const disabled = resolving || acting;

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-background/50 p-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {volumeId ? (
            <Link
              href={`/${locale}/book/${encodeURIComponent(volumeId)}`}
              className="font-medium text-foreground hover:underline"
            >
              {rec.title}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{rec.title}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {author ? `${author} · ` : ""}({rec.year})
          </span>
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
          <p className="mt-2 text-xs text-destructive">{tAi("bookNotFound")}</p>
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
            variant={status === "READ" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="h-auto flex-col gap-0.5 px-1 py-2 text-[10px] sm:text-xs"
            onClick={handleRead}
          >
            <Star className="h-3.5 w-3.5" />
            {t("read")}
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
