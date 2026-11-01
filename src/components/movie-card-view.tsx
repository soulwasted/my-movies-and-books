"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, Flag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoritePersonHeart } from "@/components/favorite-person-button";
import { MediaTile, metaLine } from "@/components/media-tile";
import type { MovieCardSummary } from "@/lib/movie-card";
import type { QueueReason } from "@/lib/queue-types";
import { cn } from "@/lib/utils";

/**
 * Film má čtyři úrovně informací, každá vyšší obsahuje vše z nižší ve stejném pořadí:
 *   1 tile    – knihovna, Objevovat, filmografie: plakát, název, rok (MovieTile)
 *   2 preview – AI chat: + původní název, žánry, délka, hodnocení, důvod, popis na 3 řádky, režie a 3 herci
 *   3 card    – swipe fronta: + celý popis, scénář, hudba, 6 herců se srdíčky, nahlášení chyby, odkaz na detail
 *   4 detail  – stránka /movie/[id]: + herci s fotkami, trailery, podobné filmy, další názvy, odkazy ven
 */
export type MovieCardLevel = "preview" | "card";

const LIMITS = {
  preview: { genres: 2, directors: 2, cast: 3, overviewClamp: "line-clamp-3" },
  card: { genres: 4, directors: 4, cast: 6, overviewClamp: "" },
} as const;

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

/** Hodnocení jako odznaky, stejně na všech úrovních od náhledu výš. */
export function MovieRatings({ voteAverage, csfdRating }: { voteAverage: number; csfdRating: number | null }) {
  return (
    <>
      {voteAverage > 0 && (
        <Badge variant="secondary" className="text-xs tabular-nums">
          TMDB {voteAverage.toFixed(1)}
        </Badge>
      )}
      {csfdRating != null && (
        <Badge variant="outline" className="text-xs tabular-nums">
          ČSFD {csfdRating}%
        </Badge>
      )}
    </>
  );
}

/** Jména prolinkovaná na stránku člověka; srdíčko až od úrovně karty. Jméno jen z CZDB zůstane textem. */
function PeopleList({
  names,
  card,
  locale,
  hearts,
}: {
  names: string[];
  card: MovieCardSummary;
  locale: string;
  hearts: boolean;
}) {
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
                <Link
                  href={`/${locale}/person/${person.tmdbPersonId}`}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {name}
                </Link>
                {hearts && (
                  <FavoritePersonHeart
                    person={person}
                    initialFavorite={favorites.has(person.tmdbPersonId)}
                    className="ml-1 size-3.5 -translate-y-px align-middle"
                  />
                )}
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

/** Úrovně 2 a 3: náhled (AI chat) a karta (swipe fronta). */
export function MovieCardView({
  card,
  level,
  reason,
  locale,
  onReport,
  priority = false,
  children,
}: {
  card: MovieCardSummary;
  level: MovieCardLevel;
  reason?: QueueReason;
  locale: string;
  /** Jen úroveň karty. */
  onReport?: () => void;
  priority?: boolean;
  /** Akce pod údaji (rozhodovací tlačítka náhledu). */
  children?: ReactNode;
}) {
  const t = useTranslations("movie");
  const tReport = useTranslations("report");
  const isCard = level === "card";
  const limit = LIMITS[level];
  const href = `/${locale}/movie/${card.tmdbId}`;

  const credits = [
    { label: t("director"), names: card.directors.slice(0, limit.directors) },
    ...(isCard
      ? [
          { label: t("writer"), names: card.writers },
          { label: t("composer"), names: card.composers },
        ]
      : []),
    { label: t("cast"), names: card.cast.slice(0, limit.cast) },
  ].filter((c) => c.names.length > 0);

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
        ) : (
          card.poster && (
            <Image src={card.poster} alt={card.czechTitle} fill sizes="96px" className="object-cover" unoptimized />
          )
        )}
      </Link>

      <div className={cn("flex min-w-0 flex-1 flex-col", isCard ? "gap-3 p-4 sm:p-5" : "gap-1.5")}>
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0 flex-1 hover:underline">
            {isCard ? (
              <h2 className="text-xl font-bold leading-snug sm:text-2xl">{card.czechTitle}</h2>
            ) : (
              <h3 className="text-base font-semibold leading-snug">{card.czechTitle}</h3>
            )}
            {card.originalTitle !== card.czechTitle && (
              <p className={cn("text-muted-foreground", isCard ? "mt-1 text-sm" : "text-xs")}>{card.originalTitle}</p>
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

        {card.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.genres.slice(0, limit.genres).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs font-normal">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-muted-foreground tabular-nums", textSize)}>
            {metaLine([card.year, card.runtime ? `${card.runtime} min` : null])}
          </span>
          <MovieRatings voteAverage={card.voteAverage} csfdRating={card.csfdRating} />
        </div>

        {card.overview && (
          <div className={textSize}>
            {isCard && <span className="font-medium text-foreground">{t("overview")}: </span>}
            <p className={cn("leading-relaxed text-muted-foreground", isCard && "mt-1", limit.overviewClamp)}>
              {card.overview}
            </p>
          </div>
        )}

        {credits.map((c) => (
          <p key={c.label} className={textSize}>
            <span className="font-medium text-foreground">{c.label}: </span>
            <PeopleList names={c.names} card={card} locale={locale} hearts={isCard} />
          </p>
        ))}

        {isCard && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Eye className="h-3.5 w-3.5" />
            {t("detailLink")}
          </Link>
        )}

        {children}
      </div>
    </div>
  );
}

/** Úroveň 1: dlaždice filmu. */
export function MovieTile({
  movie,
  locale,
  meta,
  ...slots
}: {
  movie: { tmdbId: number; czechTitle: string; poster: string | null; year: string | null };
  locale: string;
  /** Údaj za rokem (role ve filmografii). */
  meta?: string | null;
} & Pick<Parameters<typeof MediaTile>[0], "badge" | "overlay" | "footer" | "actions">) {
  return (
    <MediaTile
      href={`/${locale}/movie/${movie.tmdbId}`}
      title={movie.czechTitle}
      image={movie.poster}
      meta={[movie.year, meta]}
      {...slots}
    />
  );
}
