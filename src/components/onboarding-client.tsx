"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { savePreferencesAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Genre = { id: number; name: string };

export function OnboardingClient({ locale }: { locale: string }) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const t = useTranslations("onboarding");

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then((d) => setGenres(d.genres ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleContinue = async () => {
    if (selected.length < 3) return;
    setSaving(true);
    await savePreferencesAction({
      favoriteGenreIds: selected,
      locale,
      onboardingComplete: true,
    });
    router.push(`/${locale}`);
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-8 pb-12">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {genres.map((g) => (
          <button key={g.id} type="button" onClick={() => toggle(g.id)}>
            <Badge
              variant={selected.includes(g.id) ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm transition-colors",
                selected.includes(g.id) && "bg-primary",
              )}
            >
              {g.name}
            </Badge>
          </button>
        ))}
      </div>

      {selected.length < 3 && (
        <p className="mt-4 text-sm text-amber-500">{t("minGenres")}</p>
      )}

      <Button
        className="mt-auto"
        size="lg"
        disabled={selected.length < 3 || saving}
        onClick={handleContinue}
      >
        {t("continue")}
      </Button>
    </main>
  );
}
