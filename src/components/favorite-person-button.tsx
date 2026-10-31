"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavoritePersonAction } from "@/lib/actions";

export function FavoritePersonButton({
  person,
  initialFavorite,
}: {
  person: { tmdbPersonId: number; name: string; profilePath: string | null; department: string };
  initialFavorite: boolean;
}) {
  const t = useTranslations("person");
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    setFavorite((f) => !f);
    startTransition(async () => {
      try {
        setFavorite(await toggleFavoritePersonAction(person));
      } catch {
        setFavorite(favorite);
      }
    });
  };

  return (
    <Button
      variant={favorite ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
    >
      <Heart className={favorite ? "mr-1 h-4 w-4 fill-current" : "mr-1 h-4 w-4"} />
      {favorite ? t("favorite") : t("addFavorite")}
    </Button>
  );
}

/** Malé srdíčko bez textu pro seznamy lidí (herci a tvůrci na detailu filmu). */
export function FavoritePersonHeart({
  person,
  initialFavorite,
  className = "",
}: {
  person: { tmdbPersonId: number; name: string; profilePath: string | null; department: string };
  initialFavorite: boolean;
  className?: string;
}) {
  const t = useTranslations("person");
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const previous = favorite;
    setFavorite(!previous);
    startTransition(async () => {
      try {
        setFavorite(await toggleFavoritePersonAction(person));
      } catch {
        setFavorite(previous);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={`${favorite ? t("favorite") : t("addFavorite")}: ${person.name}`}
      title={favorite ? t("favorite") : t("addFavorite")}
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-60 ${
        favorite ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
      } ${className}`}
    >
      <Heart className={`size-full ${favorite ? "fill-current" : ""}`} />
    </button>
  );
}
