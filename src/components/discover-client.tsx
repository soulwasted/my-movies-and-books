"use client";

import { TILE_GRID } from "@/components/media-tile";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { posterUrl, type TmdbMovieListItem } from "@/lib/tmdb";
import { coverUrl, type GoogleBookListItem } from "@/lib/google-books";
import { booksEnabled } from "@/lib/features";
import { MovieTile } from "@/components/movie-card-view";
import { BookTile } from "@/components/book-card-view";

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
      <div className={TILE_GRID}>
        {results.map((movie) => (
          <MovieTile
            key={movie.id}
            movie={{
              tmdbId: movie.id,
              czechTitle: movie.title,
              poster: posterUrl(movie.poster_path, "w342"),
              year: movie.release_date?.slice(0, 4) ?? null,
            }}
            locale={locale}
          />
        ))}
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
      <div className={TILE_GRID}>
        {results.map((book) => (
          <BookTile
            key={book.id}
            book={{
              googleVolumeId: book.id,
              title: book.title,
              cover: coverUrl(book.cover, "small"),
              author: book.authors[0] ?? null,
              year: book.publishedDate?.slice(0, 4) ?? null,
            }}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

export function DiscoverClient({ locale }: { locale: string }) {
  const t = useTranslations("discover");

  if (!booksEnabled) {
    return (
      <div className="mt-4">
        <MovieSearch locale={locale} />
      </div>
    );
  }

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
