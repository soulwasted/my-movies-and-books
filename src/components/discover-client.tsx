"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { posterUrl, type TmdbMovieListItem } from "@/lib/tmdb";

export function DiscoverClient({ locale }: { locale: string }) {
  const t = useTranslations("discover");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovieListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <Input
        placeholder={t("search")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
      />
      {loading && <p className="text-sm text-muted-foreground">…</p>}
      <div className="grid grid-cols-2 gap-3">
        {results.map((movie) => {
          const poster = posterUrl(movie.poster_path, "w342");
          return (
            <Link
              key={movie.id}
              href={`/${locale}/movie/${movie.id}`}
              className="overflow-hidden rounded-xl border border-border/50 bg-card"
            >
              <div className="relative aspect-[2/3] bg-muted">
                {poster && (
                  <Image src={poster} alt={movie.title} fill className="object-cover" />
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-medium">{movie.title}</p>
                <p className="text-xs text-muted-foreground">
                  {movie.release_date?.slice(0, 4)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
