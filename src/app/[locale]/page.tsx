import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwipeDeck } from "@/components/swipe-deck";
import { BookSwipeDeck } from "@/components/book-swipe-deck";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  await ensureUser(userId);

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (!prefs?.onboardingComplete) {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("todayPicks")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Tabs defaultValue="movies" className="flex flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movies">{t("movies")}</TabsTrigger>
          <TabsTrigger value="books">{t("books")}</TabsTrigger>
        </TabsList>
        <TabsContent value="movies" className="mt-4 flex flex-1 flex-col">
          <SwipeDeck locale={locale} />
        </TabsContent>
        <TabsContent value="books" className="mt-4 flex flex-1 flex-col">
          <BookSwipeDeck locale={locale} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
