"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { AiStep } from "@/lib/ai-stream";

/** Kroky, které /api/ai hlásí během zpracování, převedené na texty pro loader. */
export function useAiSteps() {
  const t = useTranslations("aiSteps");
  const [steps, setSteps] = useState<AiStep[]>([]);

  const labels = steps.map((s) => {
    if (s.id === "profile") return t("profile");
    if (s.id === "ask") return t("ask", { rated: s.rated, excluded: s.excluded });
    return t(s.source === "books" ? "verifyBooks" : "verify", { count: s.count });
  });

  const push = useCallback((step: AiStep) => setSteps((prev) => [...prev, step]), []);
  const reset = useCallback(() => setSteps([]), []);

  return { labels, push, reset };
}
