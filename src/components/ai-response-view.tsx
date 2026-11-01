"use client";

import { useTranslations } from "next-intl";
import type { AiStructuredResponse } from "@/lib/ai";
import { AiRecommendationCard } from "@/components/ai-recommendation-card";
import { AiBookRecommendationCard } from "@/components/ai-book-recommendation-card";
import { Chip } from "@/components/chat-chip";

export function AiResponseView({
  data,
  locale,
  media = "movie",
  onReply,
}: {
  data: AiStructuredResponse;
  locale: string;
  media?: "movie" | "book";
  /** Pošle odpověď do chatu; bez něj se nabídnuté odpovědi neukážou. */
  onReply?: (text: string) => void;
}) {
  const t = useTranslations("ai");

  const Card = media === "book" ? AiBookRecommendationCard : AiRecommendationCard;

  return (
    <div className="space-y-3">
      {data.summary && (
        <p className="text-sm leading-relaxed">{data.summary}</p>
      )}

      {data.recommendations.length > 0 && (
        <div className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <Card
              key={`${rec.title}-${rec.year}-${i}`}
              rec={rec}
              locale={locale}
            />
          ))}
        </div>
      )}

      {data.followUp && (
        <p className="text-sm italic text-muted-foreground">{data.followUp}</p>
      )}

      {onReply && !!data.followUpOptions?.length && (
        <div className="flex flex-wrap gap-2">
          {data.followUpOptions.map((option) => (
            <Chip key={option} onClick={() => onReply(option)} disabled={false}>
              {option}
            </Chip>
          ))}
        </div>
      )}

      {data.recommendations.length === 0 && !data.summary && (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      )}
    </div>
  );
}
