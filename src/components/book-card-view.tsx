"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaTile, metaLine } from "@/components/media-tile";
import { ReasonChip } from "@/components/movie-card-view";
import type { BookCardSummary } from "@/lib/book-card";
import type { QueueReason } from "@/lib/queue-types";
import { cn } from "@/lib/utils";

/**
 * Kniha má stejné čtyři úrovně jako film (viz movie-card-view), autoři místo tvůrců:
 *   1 tile    – knihovna, Objevovat: obálka, název, autor · rok (BookTile)
 *   2 preview – AI chat: + kategorie, stránky, hodnocení, důvod, popis na 3 řádky
 *   3 card    – swipe fronta: + celý popis, nahlášení chyby, odkaz na detail
 *   4 detail  – stránka /book/[id]
 */
export type BookCardLevel = "preview" | "card";

const LIMITS = {
  preview: { categories: 2, overviewClamp: "line-clamp-3" },
  card: { categories: 4, overviewClamp: "" },
} as const;

export function BookCardView({
  card,
  level,
  reason,
  locale,
  onReport,
  priority = false,
  children,
}: {
  card: BookCardSummary;
  level: BookCardLevel;
  reason?: QueueReason;
  locale: string;
  onReport?: () => void;
  priority?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("book");
  const tReport = useTranslations("bookReport");
  const isCard = level === "card";
  const limit = LIMITS[level];
  const href = `/${locale}/book/${encodeURIComponent(card.googleVolumeId)}`;
  const textSize = isCard ? "text-sm" : "text-xs";

  return (
    <div className={cn("flex", isCard ? "flex-col sm:flex-row sm:items-start" : "gap-3 p-3")}>
      <Link
        href={href}
        className={cn(
          "relative shrink-0",
          isCard
            ? "flex items-center justify-center bg-muted/40 p-3 sm:w-40 md:w-44"
            : "aspect-[2/3] w-20 self-start overflow-hidden rounded-md bg-muted sm:w-24",
        )}
      >
        {isCard ? (
          <div className="relative aspect-[2/3] w-full max-w-[140px] sm:w-full sm:max-w-none">
            {card.cover ? (
              <Image
                src={card.cover}
                alt={card.title}
                fill
                sizes="(min-width: 768px) 176px, (min-width: 640px) 160px, 140px"
                className="rounded-lg object-contain"
                priority={priority}
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("noCover")}
              </div>
            )}
          </div>
        ) : (
          card.cover && <Image src={card.cover} alt={card.title} fill sizes="96px" className="object-cover" unoptimized />
        )}
      </Link>

      <div className={cn("flex min-w-0 flex-1 flex-col", isCard ? "gap-3 p-4 sm:p-5" : "gap-1.5")}>
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0 flex-1 hover:underline">
            {isCard ? (
              <h2 className="text-xl font-bold leading-snug sm:text-2xl">{card.title}</h2>
            ) : (
              <h3 className="text-base font-semibold leading-snug">{card.title}</h3>
            )}
            {card.authors.length > 0 && (
              <p className={cn("text-muted-foreground", isCard ? "mt-1 text-sm" : "text-xs")}>
                {card.authors.join(", ")}
              </p>
            )}
          </Link>
          {isCard && onReport && (
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs text-muted-foreground" onClick={onReport}>
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tReport("button")}</span>
            </Button>
          )}
        </div>

        {reason && <ReasonChip reason={reason} />}

        {card.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.categories.slice(0, limit.categories).map((c) => (
              <Badge key={c} variant="outline" className="text-xs font-normal">
                {c}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-muted-foreground tabular-nums", textSize)}>
            {metaLine([card.year, card.pageCount ? `${card.pageCount} ${t("pages")}` : null])}
          </span>
          {card.averageRating != null && (
            <Badge variant="secondary" className="text-xs tabular-nums">
              ★ {card.averageRating.toFixed(1)}
            </Badge>
          )}
        </div>

        {card.overview && (
          <div className={textSize}>
            {isCard && <span className="font-medium text-foreground">{t("overview")}: </span>}
            <p className={cn("leading-relaxed text-muted-foreground", isCard && "mt-1", limit.overviewClamp)}>
              {card.overview}
            </p>
          </div>
        )}

        {isCard && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <BookOpen className="h-3.5 w-3.5" />
            {t("detailLink")}
          </Link>
        )}

        {children}
      </div>
    </div>
  );
}

/** Úroveň 1: dlaždice knihy. */
export function BookTile({
  book,
  locale,
  ...slots
}: {
  book: { googleVolumeId: string; title: string; cover: string | null; author: string | null; year: string | null };
  locale: string;
} & Pick<Parameters<typeof MediaTile>[0], "badge" | "overlay" | "footer" | "actions">) {
  return (
    <MediaTile
      href={`/${locale}/book/${encodeURIComponent(book.googleVolumeId)}`}
      title={book.title}
      image={book.cover}
      meta={[book.author, book.year]}
      unoptimized
      {...slots}
    />
  );
}
