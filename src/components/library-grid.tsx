"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heart, Star, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { RatingDialog } from "@/components/rating-dialog";
import { saveMovieAction } from "@/lib/actions";
import { choiceToggleStyles } from "@/lib/choice-toggle-styles";
import { cn } from "@/lib/utils";
import type { MovieMeta } from "@/app/api/movies/meta/route";

type Item = {
  tmdbId: number;
  status: string;
  rating: number | null;
  ratingType: string | null;
  tags: string;
  updatedAt: string | Date;
};

type Decision = "WATCHED" | "WANT" | "NOT_INTERESTED";

const STATUS_KEYS: Record<string, string> = {
  SEEN: "statusSeen",
  SKIPPED: "statusSkipped",
  NOT_INTERESTED: "statusNotInterested",
  WANT: "statusWant",
  WATCHED: "statusWatched",
};

/** Pořadí filtrů v historii; přeskočené hned za „vše“, protože je hledáš nejčastěji. */
const FILTERS = ["ALL", "SKIPPED", "SEEN", "NOT_INTERESTED", "WANT", "WATCHED"] as const;
type Filter = (typeof FILTERS)[number];

async function fetchMeta(ids: number[]): Promise<Record<number, MovieMeta>> {
  const res = await fetch("/api/movies/meta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) return {};
  return (await res.json()).meta ?? {};
}

async function fetchSingleMeta(tmdbId: number): Promise<MovieMeta | null> {
  const res = await fetch(`/api/movies/${tmdbId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    title: data.card?.czechTitle ?? data.movie.title,
    poster: data.card?.poster ?? null,
    year: data.card?.year ?? data.movie.release_date?.slice(0, 4) ?? null,
  };
}

export function LibraryGrid({
  items,
  locale,
  showStatus = false,
}: {
  items: Item[];
  locale: string;
  /** Režim historie: štítek stavu, filtr podle stavu a rozhodnutí přímo z karty. */
  showStatus?: boolean;
}) {
  const t = useTranslations("library");
  const tSwipe = useTranslations("swipe");
  const [meta, setMeta] = useState<Record<number, MovieMeta>>({});
  const [statusOverride, setStatusOverride] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<Filter>("ALL");
  const [ratingFor, setRatingFor] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = items.map((i) => i.tmdbId);
      const batch = await fetchMeta(ids);
      if (cancelled) return;
      setMeta(batch);
      // Filmy, které v cache chybí, dotáhnout jednotlivě (výjimečně).
      for (const id of ids.filter((id) => !batch[id])) {
        const single = await fetchSingleMeta(id);
        if (cancelled) return;
        if (single) setMeta((prev) => ({ ...prev, [id]: single }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const statusOf = (item: Item) => statusOverride[item.tmdbId] ?? item.status;

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length };
    for (const item of items) {
      const s = statusOverride[item.tmdbId] ?? item.status;
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [items, statusOverride]);

  const visible = filter === "ALL" ? items : items.filter((i) => statusOf(i) === filter);

  const decide = async (
    tmdbId: number,
    status: Decision,
    rating?: { rating?: number; ratingType?: "STARS" | "SCALE" },
  ) => {
    setStatusOverride((prev) => ({ ...prev, [tmdbId]: status }));
    try {
      await saveMovieAction({ tmdbId, status, ...rating, skipRevalidate: true });
    } catch {
      setStatusOverride((prev) => {
        const next = { ...prev };
        delete next[tmdbId];
        return next;
      });
    }
  };

  return (
    <>
      {showStatus && (
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.filter((f) => f === "ALL" || counts[f]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={choiceToggleStyles(filter === f, "rounded-md px-3 py-1.5 text-xs")}
            >
              {f === "ALL" ? t("filterAll") : t(STATUS_KEYS[f])} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((item) => {
          const m = meta[item.tmdbId];
          const status = statusOf(item);
          const tags: string[] = JSON.parse(item.tags || "[]");
          const statusKey = STATUS_KEYS[status];

          return (
            <div
              key={`${item.tmdbId}-${item.updatedAt}`}
              className="overflow-hidden rounded-xl border border-border/50 bg-card transition hover:border-primary/30"
            >
              <Link href={`/${locale}/movie/${item.tmdbId}`} className="block">
                <div className="relative aspect-[2/3] bg-muted">
                  {m?.poster ? (
                    <Image
                      src={m.poster}
                      alt={m.title}
                      fill
                      sizes="(min-width: 640px) 200px, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      …
                    </div>
                  )}
                  {item.rating != null && status === "WATCHED" && (
                    <div className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5">
                      <StarRatingDisplay rating={item.rating} ratingType={item.ratingType} size="sm" />
                    </div>
                  )}
                  {showStatus && statusKey && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge variant="secondary" className="w-full justify-center text-[10px]">
                        {t(statusKey)}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{m?.title ?? `#${item.tmdbId}`}</p>
                  {m?.year && <p className="text-xs text-muted-foreground">{m.year}</p>}
                  {tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="px-1 py-0 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>

              {showStatus && (
                <div className="grid grid-cols-3 border-t border-border/50">
                  {(
                    [
                      ["WATCHED", Star, tSwipe("watched")],
                      ["WANT", Heart, tSwipe("want")],
                      ["NOT_INTERESTED", ThumbsDown, tSwipe("notInterested")],
                    ] as const
                  ).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={() =>
                        value === "WATCHED" ? setRatingFor(item.tmdbId) : decide(item.tmdbId, value)
                      }
                      className={cn(
                        "flex items-center justify-center py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        status === value && "text-primary",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", status === value && "fill-current")} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <RatingDialog
        open={ratingFor != null}
        onOpenChange={(open) => !open && setRatingFor(null)}
        onSave={async (data) => {
          if (ratingFor == null) return;
          const id = ratingFor;
          setRatingFor(null);
          await decide(id, "WATCHED", data);
        }}
      />
    </>
  );
}
