"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AiRecommendPanel({
  locale,
  movieTitle,
}: {
  locale: "cs" | "en";
  movieTitle: string;
}) {
  const t = useTranslations("movie");
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWhy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          locale,
          message:
            locale === "cs"
              ? `Proč by se mi mohl líbit film "${movieTitle}"? A co podobného doporučíš?`
              : `Why might I like "${movieTitle}"? What similar films do you recommend?`,
        }),
      });
      const data = await res.json();
      setText(data.text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("aiWhy")}</h2>
        <Button size="sm" variant="ghost" onClick={fetchWhy} disabled={loading}>
          <Sparkles className="mr-1 h-4 w-4" />
          AI
        </Button>
      </div>
      {text && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>}
    </section>
  );
}
