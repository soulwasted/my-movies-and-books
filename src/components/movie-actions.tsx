"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { saveMovieAction } from "@/lib/actions";
import { Heart, Star, Check } from "lucide-react";

type UserMovie = {
  status: string;
  rating: number | null;
} | null;

export function MovieActions({
  tmdbId,
  userMovie,
}: {
  tmdbId: number;
  userMovie: UserMovie;
  locale: string;
}) {
  const t = useTranslations("swipe");
  const [status, setStatus] = useState(userMovie?.status ?? null);

  const update = async (newStatus: "WATCHED" | "WANT" | "SKIPPED", rating?: number) => {
    await saveMovieAction({
      tmdbId,
      status: newStatus,
      ...(rating && { rating, ratingType: "STARS" as const }),
    });
    setStatus(newStatus);
  };

  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      <Button
        variant={status === "WATCHED" ? "default" : "outline"}
        size="sm"
        onClick={() => update("WATCHED", 4)}
      >
        <Check className="mr-1 h-4 w-4" /> {t("watched")}
      </Button>
      <Button
        variant={status === "WANT" ? "default" : "outline"}
        size="sm"
        onClick={() => update("WANT")}
      >
        <Heart className="mr-1 h-4 w-4" /> {t("want")}
      </Button>
      {userMovie?.rating != null && (
        <span className="flex items-center text-sm text-muted-foreground">
          <Star className="mr-1 h-4 w-4 fill-amber-400 text-amber-400" />
          {userMovie.rating}
        </span>
      )}
    </div>
  );
}
