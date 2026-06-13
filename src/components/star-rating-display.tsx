"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScale, normalizeToScale, starFillLevel } from "@/lib/rating";

export function StarRatingDisplay({
  rating,
  ratingType,
  size = "sm",
  showScale = true,
}: {
  rating: number;
  ratingType?: string | null;
  size?: "sm" | "md";
  showScale?: boolean;
}) {
  const scale = normalizeToScale(rating, ratingType);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = starFillLevel(scale, n);
          return (
            <span key={n} className="relative inline-block">
              <Star className={cn(iconSize, "text-muted-foreground/40")} />
              {fill > 0 && (
                <Star
                  className={cn(
                    iconSize,
                    "absolute inset-0 fill-amber-400 text-amber-400",
                  )}
                  style={
                    fill === 0.5
                      ? { clipPath: "inset(0 50% 0 0)" }
                      : undefined
                  }
                />
              )}
            </span>
          );
        })}
      </span>
      {showScale && (
        <span
          className={cn(
            "tabular-nums text-muted-foreground",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {formatScale(scale)}
        </span>
      )}
    </span>
  );
}
