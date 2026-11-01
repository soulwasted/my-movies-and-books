"use client";

import { TILE_GRID } from "@/components/media-tile";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { BookTile } from "@/components/book-card-view";

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
  NOT_INTERESTED: "statusNotInterested",
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
    <div className={TILE_GRID}>
      {items.map((item) => {
        const b = books[item.googleVolumeId];
        const statusKey = STATUS_KEYS[item.status];

        return (
          <BookTile
            key={item.googleVolumeId}
            book={{
              googleVolumeId: item.googleVolumeId,
              title: b?.title ?? "…",
              cover: b?.cover ?? null,
              author: b?.author || null,
              year: b?.year || null,
            }}
            locale={locale}
            badge={
              item.rating != null &&
              item.status === "READ" && (
                <div className="rounded bg-black/70 px-1.5 py-0.5">
                  <StarRatingDisplay rating={item.rating} ratingType={item.ratingType} size="sm" />
                </div>
              )
            }
            overlay={
              showStatus &&
              statusKey && (
                <Badge variant="secondary" className="w-full justify-center text-[10px]">
                  {t(statusKey)}
                </Badge>
              )
            }
          />
        );
      })}
    </div>
  );
}
