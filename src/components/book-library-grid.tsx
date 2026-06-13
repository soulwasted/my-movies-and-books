"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { StarRatingDisplay } from "@/components/star-rating-display";

type Item = {
  googleVolumeId: string;
  status: string;
  rating: number | null;
  ratingType: string | null;
  tags: string;
  updatedAt: string | Date;
};

const STATUS_KEYS: Record<string, string> = {
  SEEN: "statusSeen",
  SKIPPED: "statusSkipped",
  WANT: "statusWant",
  READ: "statusRead",
};

export function BookLibraryGrid({
  items,
  locale,
  showStatus = false,
}: {
  items: Item[];
  locale: string;
  showStatus?: boolean;
}) {
  const t = useTranslations("library");
  const [books, setBooks] = useState<
    Record<string, { title: string; cover: string | null; year: string; author: string }>
  >({});

  useEffect(() => {
    items.forEach(async (item) => {
      const res = await fetch(`/api/books/${encodeURIComponent(item.googleVolumeId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setBooks((prev) => ({
        ...prev,
        [item.googleVolumeId]: {
          title: data.card?.title ?? data.book.title,
          cover: data.card?.cover ?? data.book.cover,
          year: data.card?.year ?? "",
          author: data.card?.authors?.[0] ?? data.book.authors?.[0] ?? "",
        },
      }));
    });
  }, [items]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const b = books[item.googleVolumeId];
        const statusKey = STATUS_KEYS[item.status];

        return (
          <Link
            key={item.googleVolumeId}
            href={`/${locale}/book/${encodeURIComponent(item.googleVolumeId)}`}
            className="overflow-hidden rounded-xl border border-border/50 bg-card transition-colors hover:border-primary/30"
          >
            <div className="relative aspect-[2/3] bg-muted">
              {b?.cover ? (
                <Image
                  src={b.cover}
                  alt={b.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  …
                </div>
              )}
              {item.rating != null && item.status === "READ" && (
                <div className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5">
                  <StarRatingDisplay
                    rating={item.rating}
                    ratingType={item.ratingType}
                    size="sm"
                  />
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-sm font-medium">{b?.title ?? "…"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {b?.author}
                {b?.year ? ` · ${b.year}` : ""}
              </p>
              {showStatus && statusKey && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {t(statusKey)}
                </Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
