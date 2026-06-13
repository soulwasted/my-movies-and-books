"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { posterUrl, type TmdbMovieListItem } from "@/lib/tmdb";
import { coverUrl, type GoogleBookListItem } from "@/lib/google-books";

function MovieSearch({ locale }: { locale: string }) {
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
    <div className="space-y-4">
      <Input
        placeholder={t("searchMovie")}
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

function BookSearch({ locale }: { locale: string }) {
  const t = useTranslations("discover");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/books/search?q=${encodeURIComponent(q)}&locale=${locale}`,
      );
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder={t("searchBook")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
      />
      {loading && <p className="text-sm text-muted-foreground">…</p>}
      <div className="grid grid-cols-2 gap-3">
        {results.map((book) => {
          const cover = coverUrl(book.cover, "small");
          return (
            <Link
              key={book.id}
              href={`/${locale}/book/${encodeURIComponent(book.id)}`}
              className="overflow-hidden rounded-xl border border-border/50 bg-card"
            >
              <div className="relative aspect-[2/3] bg-muted">
                {cover && (
                  <Image src={cover} alt={book.title} fill className="object-cover" unoptimized />
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {book.authors[0] ?? ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DiscoverClient({ locale }: { locale: string }) {
  const t = useTranslations("discover");

  return (
    <Tabs defaultValue="movies" className="mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="movies">{t("movies")}</TabsTrigger>
        <TabsTrigger value="books">{t("books")}</TabsTrigger>
      </TabsList>
      <TabsContent value="movies" className="mt-4">
        <MovieSearch locale={locale} />
      </TabsContent>
      <TabsContent value="books" className="mt-4">
        <BookSearch locale={locale} />
      </TabsContent>
    </Tabs>
  );
}
