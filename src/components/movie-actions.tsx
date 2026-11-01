"use client";

import { useState } from "react";
import { RatingDialog } from "@/components/rating-dialog";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { saveMovieAction } from "@/lib/actions";
import { normalizeToScale } from "@/lib/rating";
import { MovieDecisionButtons } from "@/components/decision-buttons";

type UserMovie = {
  status: string;
  rating: number | null;
  ratingType?: string | null;
} | null;

export function MovieActions({
  tmdbId,
  userMovie,
}: {
  tmdbId: number;
  userMovie: UserMovie;
  locale: string;
}) {
  const [status, setStatus] = useState(userMovie?.status ?? null);
  const [rating, setRating] = useState<number | null>(userMovie?.rating ?? null);
  const [ratingType, setRatingType] = useState<string | null>(
    userMovie?.ratingType ?? null,
  );
  const [ratingOpen, setRatingOpen] = useState(false);

  const update = async (
    newStatus: "WATCHED" | "WANT" | "SKIPPED" | "NOT_INTERESTED",
    data?: {
      rating?: number;
      ratingType?: "STARS" | "SCALE";
      notes?: string;
      tags?: string[];
    },
  ) => {
    await saveMovieAction({
      tmdbId,
      status: newStatus,
      ...data,
    });
    setStatus(newStatus);
    if (data?.rating != null) {
      setRating(data.rating);
      setRatingType(data.ratingType ?? null);
    }
  };

  const handleRatingSave = async (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => {
    await update("WATCHED", data);
    setRatingOpen(false);
  };

  const initialScale =
    rating != null ? normalizeToScale(rating, ratingType) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <MovieDecisionButtons
          variant="inline"
          status={status}
          onDecide={(d) => (d === "WATCHED" ? setRatingOpen(true) : update(d))}
        />
        {rating != null && status === "WATCHED" && (
          <button
            type="button"
            onClick={() => setRatingOpen(true)}
            className="hover:opacity-80"
          >
            <StarRatingDisplay
              rating={rating}
              ratingType={ratingType}
              size="md"
            />
          </button>
        )}
      </div>

      <RatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        onSave={handleRatingSave}
        initialScale={initialScale}
        initialRatingType={
          ratingType === "SCALE" ? "SCALE" : "STARS"
        }
      />
    </>
  );
}
