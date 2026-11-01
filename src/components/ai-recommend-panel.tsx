"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiResponseView } from "@/components/ai-response-view";
import { ElapsedLoader } from "@/components/elapsed-loader";
import type { AiStructuredResponse } from "@/lib/ai";
import { fetchAi } from "@/lib/ai-stream";
import { useAiSteps } from "@/components/use-ai-steps";

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
  const aiSteps = useAiSteps();

  const fetchWhy = async () => {
    setLoading(true);
    setError(null);
    aiSteps.reset();
    try {
      const data = await fetchAi(
        {
          type: "chat",
          locale,
          message:
            locale === "cs"
              ? `Proč by se mi mohl líbit film "${movieTitle}"? A co podobného doporučíš?`
              : `Why might I like "${movieTitle}"? What similar films do you recommend?`,
        },
        aiSteps.push,
      );
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "AI error");
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
          {response ? "AI" : t("aiWhyButton")}
        </Button>
      </div>
      {!response && !loading && !error && (
        <p className="mt-2 text-sm text-muted-foreground">{t("aiWhyHint")}</p>
      )}
      {loading && <ElapsedLoader label={t("aiThinking")} steps={aiSteps.labels} className="mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {response && (
        <div className="mt-3">
          <AiResponseView data={response} locale={locale} />
        </div>
      )}
    </section>
  );
}
