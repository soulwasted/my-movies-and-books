"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { savePreferencesAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Genre = { id: number; name: string };
type Category = { id: string; name: string };

export function OnboardingClient({ locale }: { locale: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const t = useTranslations("onboarding");

  useEffect(() => {
    Promise.all([
      fetch("/api/genres").then((r) => r.json()),
      fetch(`/api/book-categories?locale=${locale}`).then((r) => r.json()),
    ])
      .then(([genreData, catData]) => {
        setGenres(genreData.genres ?? []);
        setCategories(catData.categories ?? []);
      })
      .finally(() => setLoading(false));
  }, [locale]);

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleContinueStep1 = () => {
    if (selectedGenres.length < 3) return;
    setStep(2);
  };

  const handleFinish = async () => {
    if (selectedCategories.length < 3) return;
    setSaving(true);
    await savePreferencesAction({
      favoriteGenreIds: selectedGenres,
      favoriteBookCategoryIds: selectedCategories,
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

  if (step === 1) {
    return (
      <main className="flex flex-1 flex-col px-4 py-8 pb-12">
        <p className="text-xs text-muted-foreground">{t("step", { current: 1, total: 2 })}</p>
        <h1 className="mt-1 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {genres.map((g) => (
            <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}>
              <Badge
                variant={selectedGenres.includes(g.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm transition-colors",
                  selectedGenres.includes(g.id) && "bg-primary",
                )}
              >
                {g.name}
              </Badge>
            </button>
          ))}
        </div>

        {selectedGenres.length < 3 && (
          <p className="mt-4 text-sm text-amber-500">{t("minGenres")}</p>
        )}

        <Button
          className="mt-auto"
          size="lg"
          disabled={selectedGenres.length < 3}
          onClick={handleContinueStep1}
        >
          {t("continue")}
        </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-8 pb-12">
      <p className="text-xs text-muted-foreground">{t("step", { current: 2, total: 2 })}</p>
      <h1 className="mt-1 text-2xl font-bold">{t("bookTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("bookSubtitle")}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c.id} type="button" onClick={() => toggleCategory(c.id)}>
            <Badge
              variant={selectedCategories.includes(c.id) ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm transition-colors",
                selectedCategories.includes(c.id) && "bg-primary",
              )}
            >
              {c.name}
            </Badge>
          </button>
        ))}
      </div>

      {selectedCategories.length < 3 && (
        <p className="mt-4 text-sm text-amber-500">{t("minCategories")}</p>
      )}

      <div className="mt-auto flex gap-2">
        <Button variant="outline" size="lg" onClick={() => setStep(1)}>
          {t("back")}
        </Button>
        <Button
          className="flex-1"
          size="lg"
          disabled={selectedCategories.length < 3 || saving}
          onClick={handleFinish}
        >
          {t("finish")}
        </Button>
      </div>
    </main>
  );
}
