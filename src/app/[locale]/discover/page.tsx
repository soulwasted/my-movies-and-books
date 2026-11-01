import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoverClient } from "@/components/discover-client";
import { AiChatClient } from "@/components/ai-chat-client";
import { SwipeDeck } from "@/components/swipe-deck";
import { BookSwipeDeck } from "@/components/book-swipe-deck";
import { booksEnabled } from "@/lib/features";
import {
  getChatSuggestions,
  SUGGESTION_GENRES,
  SUGGESTION_LANGUAGES,
  type ChatSuggestion,
} from "@/lib/ai-suggestions";

const PERSON_DEPARTMENTS = ["Directing", "Acting", "Writing", "Sound"];
const MODES = ["search", "ai", "tips"] as const;

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const { tab } = await searchParams;
  const mode = MODES.find((m) => m === tab) ?? "search";

  const t = await getTranslations("discover");
  const tHome = await getTranslations("home");
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

      <Tabs defaultValue={mode} className="mt-4 flex flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">{t("tabSearch")}</TabsTrigger>
          <TabsTrigger value="ai">{t("tabAi")}</TabsTrigger>
          <TabsTrigger value="tips">{t("tabTips")}</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <DiscoverClient locale={locale} />
        </TabsContent>

        <TabsContent value="ai" className="flex flex-1 flex-col">
          <AiChatClient locale={locale} suggestions={suggestions} />
        </TabsContent>

        <TabsContent value="tips" className="mt-4 flex flex-1 flex-col">
          {!booksEnabled ? (
            <SwipeDeck locale={locale} />
          ) : (
            <Tabs defaultValue="movies" className="flex flex-1 flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="movies">{tHome("movies")}</TabsTrigger>
                <TabsTrigger value="books">{tHome("books")}</TabsTrigger>
              </TabsList>
              <TabsContent value="movies" className="mt-4 flex flex-1 flex-col">
                <SwipeDeck locale={locale} />
              </TabsContent>
              <TabsContent value="books" className="mt-4 flex flex-1 flex-col">
                <BookSwipeDeck locale={locale} />
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
