"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, Flag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoritePersonHeart } from "@/components/favorite-person-button";
import type { MovieCardSummary } from "@/lib/movie-card";
import type { QueueReason } from "@/lib/queue-types";

export function ReasonChip({ reason }: { reason: QueueReason }) {
  const t = useTranslations("swipe");
  const text =
    reason.type === "ai"
      ? t("reasonAi", { text: reason.text })
      : reason.type === "because"
        ? t("reasonBecause", { title: reason.title })
        : reason.type === "person"
          ? t("reasonPerson", { name: reason.name })
          : reason.type === "genres"
          ? t("reasonGenres", { genres: reason.names.join(", ") })
          : t("reasonExplore");
  return (
    <p className="flex items-center gap-1.5 text-xs text-primary">
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

/** Jména prolinkovaná na stránku člověka se srdíčkem; jméno jen z CZDB zůstane textem. */
function PeopleList({ names, card, locale }: { names: string[]; card: MovieCardSummary; locale: string }) {
  const favorites = new Set(card.favoritePersonIds ?? []);
  return (
    <span className="text-muted-foreground">
      {names.map((name, i) => {
        const person = card.people?.[name.toLowerCase()];
        return (
          <span key={name}>
            {i > 0 && ", "}
            {person ? (
              <>
                <Link href={`/${locale}/person/${person.tmdbPersonId}`} className="underline-offset-4 hover:text-foreground hover:underline">
                  {name}
                </Link>
                <FavoritePersonHeart
                  person={person}
                  initialFavorite={favorites.has(person.tmdbPersonId)}
                  className="ml-1 size-3.5 -translate-y-px align-middle"
                />
              </>
            ) : (
              name
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Obsah karty filmu: swipe fronta i AI doporučení ukazují stejné údaje. */
export function MovieCardView({
  card,
  reason,
  locale,
  onReport,
  priority = false,
  compact = false,
  children,
}: {
  card: MovieCardSummary;
  reason?: QueueReason;
  locale: string;
  onReport?: () => void;
  priority?: boolean;
  /** Menší plakát a jen nejdůležitější údaje (AI doporučení v chatu). */
  compact?: boolean;
  /** Akce pod údaji (tlačítka AI karty). */
  children?: ReactNode;
}) {
  const t = useTranslations("movie");
  const tReport = useTranslations("report");

  if (compact) {
    const people = [
      card.directors.length ? `${t("director")}: ${card.directors.join(", ")}` : null,
      card.cast.length ? `${t("cast")}: ${card.cast.slice(0, 3).join(", ")}` : null,
    ].filter(Boolean);
    return (
      <div className="flex gap-3 p-3">
        <Link
          href={`/${locale}/movie/${card.tmdbId}`}
          className="relative aspect-[2/3] w-20 shrink-0 self-start overflow-hidden rounded-md bg-muted sm:w-24"
        >
          {card.poster && (
            <Image src={card.poster} alt={card.czechTitle} fill sizes="96px" className="object-cover" unoptimized />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link href={`/${locale}/movie/${card.tmdbId}`} className="min-w-0 hover:underline">
            <h3 className="text-base font-semibold leading-snug text-foreground">{card.czechTitle}</h3>
          </Link>
          <p className="text-xs text-muted-foreground tabular-nums">
            {[
              card.originalTitle !== card.czechTitle ? card.originalTitle : null,
              card.year,
              card.runtime ? `${card.runtime} min` : null,
              card.genres.slice(0, 2).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {card.voteAverage > 0 && (
              <Badge variant="secondary" className="text-[11px]">
                TMDB {card.voteAverage.toFixed(1)}
              </Badge>
            )}
            {card.csfdRating != null && (
              <Badge variant="outline" className="text-[11px]">
                ČSFD {card.csfdRating}%
              </Badge>
            )}
          </div>
          {reason && <ReasonChip reason={reason} />}
          {card.overview && (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{card.overview}</p>
          )}
          {people.length > 0 && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{people.join(" · ")}</p>
          )}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start">
      <Link
        href={`/${locale}/movie/${card.tmdbId}`}
        className="relative flex shrink-0 items-center justify-center bg-muted/40 p-3 sm:w-40 md:w-44"
      >
        <div className="relative aspect-[2/3] w-full max-w-[140px] sm:max-w-none sm:w-full">
          {card.poster ? (
            <Image
              src={card.poster}
              alt={card.czechTitle}
              fill
              sizes="(min-width: 768px) 176px, (min-width: 640px) 160px, 140px"
              className="rounded-lg object-contain"
              priority={priority}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("noPoster")}
            </div>
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/${locale}/movie/${card.tmdbId}`} className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-snug sm:text-2xl">{card.czechTitle}</h2>
            {card.originalTitle !== card.czechTitle && (
              <p className="mt-1 text-sm text-muted-foreground">{card.originalTitle}</p>
            )}
          </Link>
          {onReport && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-xs text-muted-foreground"
              onClick={onReport}
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tReport("button")}</span>
            </Button>
          )}
        </div>

        {reason && <ReasonChip reason={reason} />}

        {card.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.genres.slice(0, 4).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs font-normal">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {card.year && <span className="text-sm text-muted-foreground">{card.year}</span>}
          {card.runtime && (
            <span className="text-sm text-muted-foreground">{card.runtime} min</span>
          )}
          <Badge variant="secondary" className="text-xs">
            TMDB {card.voteAverage.toFixed(1)}
          </Badge>
          {card.csfdRating != null && (
            <Badge variant="outline" className="text-xs">
              ČSFD {card.csfdRating}%
            </Badge>
          )}
        </div>

        {card.overview ? (
          <div className="text-sm">
            <span className="font-medium text-foreground">{t("overview")}: </span>
            <p className="mt-1 leading-relaxed text-muted-foreground">{card.overview}</p>
          </div>
        ) : null}

        {card.directors.length > 0 && (
          <p className="text-sm">
            <span className="font-medium text-foreground">{t("director")}: </span>
            <PeopleList names={card.directors} card={card} locale={locale} />
          </p>
        )}

        {card.writers.length > 0 && (
          <p className="text-sm">
            <span className="font-medium text-foreground">{t("writer")}: </span>
            <PeopleList names={card.writers} card={card} locale={locale} />
          </p>
        )}

        {card.composers.length > 0 && (
          <p className="text-sm">
            <span className="font-medium text-foreground">{t("composer")}: </span>
            <PeopleList names={card.composers} card={card} locale={locale} />
          </p>
        )}

        {card.cast.length > 0 && (
          <p className="text-sm">
            <span className="font-medium text-foreground">{t("cast")}: </span>
            <PeopleList names={card.cast} card={card} locale={locale} />
          </p>
        )}

        <Link
          href={`/${locale}/movie/${card.tmdbId}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Eye className="h-3.5 w-3.5" />
          {t("detailLink")}
        </Link>

        {children}
      </div>
    </div>
  );
}
