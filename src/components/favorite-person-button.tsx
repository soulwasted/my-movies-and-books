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
