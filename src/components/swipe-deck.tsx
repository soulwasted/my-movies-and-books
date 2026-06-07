"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heart, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingDialog } from "@/components/rating-dialog";
import { saveMovieAction } from "@/lib/actions";
import { posterUrl, type TmdbMovieListItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export function SwipeDeck({ locale }: { locale: string }) {
  const t = useTranslations("swipe");
  const tCommon = useTranslations("common");
  const [movies, setMovies] = useState<TmdbMovieListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [ratingMovie, setRatingMovie] = useState<TmdbMovieListItem | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/movies/queue");
      const data = await res.json();
      setMovies(data.movies ?? []);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const current = movies[index];

  const advance = () => setIndex((i) => i + 1);

  const handleWant = async () => {
    if (!current) return;
    await saveMovieAction({ tmdbId: current.id, status: "WANT" });
    advance();
  };

  const handleSkip = async () => {
    if (!current) return;
    await saveMovieAction({ tmdbId: current.id, status: "SKIPPED" });
    advance();
  };

  const handleWatched = () => {
    if (!current) return;
    setRatingMovie(current);
  };

  const handleRatingSave = async (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => {
    if (!ratingMovie) return;
    await saveMovieAction({
      tmdbId: ratingMovie.id,
      status: "WATCHED",
      ...data,
    });
    setRatingMovie(null);
    advance();
  };

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
        <p className="text-muted-foreground">{t("noMore")}</p>
        <Button onClick={loadQueue} variant="outline">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto aspect-[2/3] w-full max-w-sm flex-1">
        <AnimatePresence mode="wait">
          <SwipeCard key={current.id} movie={current} locale={locale} />
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          size="lg"
          variant="outline"
          className="h-14 w-14 rounded-full border-destructive/30 text-destructive"
          onClick={handleSkip}
          aria-label={t("skip")}
        >
          <X className="h-6 w-6" />
        </Button>
        <Button
          size="lg"
          className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-500"
          onClick={handleWatched}
          aria-label={t("watched")}
        >
          <Star className="h-7 w-7 fill-current" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 w-14 rounded-full border-pink-500/30 text-pink-400"
          onClick={handleWant}
          aria-label={t("want")}
        >
          <Heart className="h-6 w-6" />
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("skip")} · {t("watched")} · {t("want")}
      </p>

      <RatingDialog
        open={!!ratingMovie}
        onOpenChange={(open) => !open && setRatingMovie(null)}
        onSave={handleRatingSave}
      />
    </>
  );
}

function SwipeCard({ movie, locale }: { movie: TmdbMovieListItem; locale: string }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const poster = posterUrl(movie.poster_path, "w500");
  const year = movie.release_date?.slice(0, 4);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Link href={`/${locale}/movie/${movie.id}`} className="block h-full">
        <div className="relative h-[72%] w-full bg-muted">
          {poster ? (
            <Image src={poster} alt={movie.title} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No poster
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold leading-tight">{movie.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {year && <span className="text-sm text-muted-foreground">{year}</span>}
            {movie.runtime && (
              <span className="text-sm text-muted-foreground">{movie.runtime} min</span>
            )}
            <Badge variant="secondary" className="text-xs">
              IMDb {movie.vote_average.toFixed(1)}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{movie.overview}</p>
        </div>
      </Link>
    </motion.div>
  );
}
