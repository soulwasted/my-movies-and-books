"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiResponseView } from "@/components/ai-response-view";
import { ElapsedLoader } from "@/components/elapsed-loader";
import type { AiStructuredResponse } from "@/lib/ai";

export function AiRecommendPanel({
  locale,
  movieTitle,
}: {
  locale: "cs" | "en";
  movieTitle: string;
}) {
  const t = useTranslations("movie");
  const [response, setResponse] = useState<AiStructuredResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWhy = async () => {
    setLoading(true);
    setError(null);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.response) {
        setError(data.error ?? "AI error");
        return;
      }
      setResponse(data.response);
    } catch {
      setError("AI error");
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
      {loading && <ElapsedLoader label={t("aiThinking")} className="mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {response && (
        <div className="mt-3">
          <AiResponseView data={response} locale={locale} />
        </div>
      )}
    </section>
  );
}
