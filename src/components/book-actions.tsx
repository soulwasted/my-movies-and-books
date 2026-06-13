"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RatingDialog } from "@/components/rating-dialog";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { saveBookAction } from "@/lib/actions";
import { normalizeToScale } from "@/lib/rating";
import { Heart, Check } from "lucide-react";

type UserBook = {
  status: string;
  rating: number | null;
  ratingType?: string | null;
} | null;

export function BookActions({
  googleVolumeId,
  userBook,
}: {
  googleVolumeId: string;
  userBook: UserBook;
  locale: string;
}) {
  const t = useTranslations("bookSwipe");
  const [status, setStatus] = useState(userBook?.status ?? null);
  const [rating, setRating] = useState<number | null>(userBook?.rating ?? null);
  const [ratingType, setRatingType] = useState<string | null>(
    userBook?.ratingType ?? null,
  );
  const [ratingOpen, setRatingOpen] = useState(false);

  const update = async (
    newStatus: "READ" | "WANT" | "SKIPPED",
    data?: {
      rating?: number;
      ratingType?: "STARS" | "SCALE";
      notes?: string;
      tags?: string[];
    },
  ) => {
    await saveBookAction({
      googleVolumeId,
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
    await update("READ", data);
    setRatingOpen(false);
  };

  const initialScale =
    rating != null ? normalizeToScale(rating, ratingType) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          variant={status === "READ" ? "default" : "outline"}
          size="sm"
          onClick={() => setRatingOpen(true)}
        >
          <Check className="mr-1 h-4 w-4" /> {t("read")}
        </Button>
        <Button
          variant={status === "WANT" ? "default" : "outline"}
          size="sm"
          onClick={() => update("WANT")}
        >
          <Heart className="mr-1 h-4 w-4" /> {t("want")}
        </Button>
        {rating != null && status === "READ" && (
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
        initialRatingType={ratingType === "SCALE" ? "SCALE" : "STARS"}
      />
    </>
  );
}
