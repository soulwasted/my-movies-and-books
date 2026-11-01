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

export function AiBookRecommendPanel({
  locale,
  bookTitle,
  bookAuthor,
}: {
  locale: "cs" | "en";
  bookTitle: string;
  bookAuthor: string;
}) {
  const t = useTranslations("book");
  const tAi = useTranslations("ai");
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
          media: "book",
          locale,
          message:
            locale === "cs"
              ? `Proč by se mi mohla líbit kniha "${bookTitle}" od ${bookAuthor}? A co podobného doporučíš?`
              : `Why might I like "${bookTitle}" by ${bookAuthor}? What similar books do you recommend?`,
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
          AI
        </Button>
      </div>
      {loading && <ElapsedLoader label={tAi("thinking")} steps={aiSteps.labels} className="mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {response && (
        <div className="mt-3">
          <AiResponseView data={response} locale={locale} media="book" />
        </div>
      )}
    </section>
  );
}
