"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AiStructuredResponse } from "@/lib/ai";

export function AiResponseView({ data }: { data: AiStructuredResponse }) {
  const t = useTranslations("ai");

  return (
    <div className="space-y-3">
      {data.summary && (
        <p className="text-sm leading-relaxed">{data.summary}</p>
      )}

      {data.recommendations.length > 0 && (
        <div className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <div
              key={`${rec.title}-${rec.year}-${i}`}
              className="rounded-lg border border-border/60 bg-background/50 p-3"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-foreground">
                  {rec.title}
                </span>
                <span className="text-xs text-muted-foreground">({rec.year})</span>
                {rec.genre && (
                  <Badge variant="secondary" className="text-[10px]">
                    {rec.genre}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {rec.reason}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.followUp && (
        <p className="text-sm italic text-muted-foreground">{data.followUp}</p>
      )}

      {data.recommendations.length === 0 && !data.summary && (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      )}
    </div>
  );
}
