import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AiChatClient } from "@/components/ai-chat-client";
import {
  getChatSuggestions,
  SUGGESTION_GENRES,
  SUGGESTION_LANGUAGES,
  type ChatSuggestion,
} from "@/lib/ai-suggestions";

const PERSON_DEPARTMENTS = ["Directing", "Acting", "Writing", "Sound"];

export default async function AiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("ai");
  const tChips = await getTranslations("ai.chips");

  const label = (s: ChatSuggestion): string | null => {
    switch (s.kind) {
      case "genre":
        return SUGGESTION_GENRES.includes(s.id) ? tChips(`genre_${s.id}`) : null;
      case "dark":
        return tChips("dark");
      case "decade":
        return s.decade === 2000
          ? tChips("decade2000")
          : tChips("decade", { decade: locale === "cs" ? s.decade % 100 : s.decade < 2000 ? s.decade % 100 : s.decade });
      case "language":
        return SUGGESTION_LANGUAGES.includes(s.code) ? tChips(`lang_${s.code}`) : null;
      case "person":
        return tChips(PERSON_DEPARTMENTS.includes(s.department) ? `person_${s.department}` : "person_other", {
          name: s.name,
        });
      case "surprise":
        return tChips("surprise");
    }
  };
  const suggestions = (await getChatSuggestions(userId).catch(() => []))
    .map(label)
    .filter((l): l is string => !!l);

  return (
    <main className="flex min-h-[calc(100vh-5rem)] flex-col px-4 pb-24 pt-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <AiChatClient locale={locale} suggestions={suggestions} />
    </main>
  );
}
