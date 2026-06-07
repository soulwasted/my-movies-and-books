"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

type Item = {
  tmdbId: number;
  rating: number | null;
  ratingType: string | null;
  tags: string;
};

export function LibraryGrid({ items, locale }: { items: Item[]; locale: string }) {
  const [movies, setMovies] = useState<
    Record<number, { title: string; poster_path: string | null; year: string }>
  >({});

  useEffect(() => {
    items.forEach(async (item) => {
      const res = await fetch(`/api/movies/${item.tmdbId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMovies((prev) => ({
        ...prev,
        [item.tmdbId]: {
          title: data.movie.title,
          poster_path: data.movie.poster_path,
          year: data.movie.release_date?.slice(0, 4) ?? "",
        },
      }));
    });
  }, [items]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const m = movies[item.tmdbId];
        const poster = m ? posterUrl(m.poster_path, "w342") : null;
        const tags: string[] = JSON.parse(item.tags || "[]");

        return (
          <Link
            key={item.tmdbId}
            href={`/${locale}/movie/${item.tmdbId}`}
            className="group overflow-hidden rounded-xl border border-border/50 bg-card transition hover:border-primary/30"
          >
            <div className="relative aspect-[2/3] bg-muted">
              {poster ? (
                <Image src={poster} alt={m?.title ?? ""} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  …
                </div>
              )}
              {item.rating != null && (
                <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-xs">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {item.rating}
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-sm font-medium">{m?.title ?? `#${item.tmdbId}`}</p>
              {m?.year && <p className="text-xs text-muted-foreground">{m.year}</p>}
              {tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
