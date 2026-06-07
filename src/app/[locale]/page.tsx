import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SwipeDeck } from "@/components/swipe-deck";
import { getTranslations, setRequestLocale } from "next-intl/server";

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

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (!prefs?.onboardingComplete) {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations("swipe");

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("todayPicks")}</h1>
        <p className="text-sm text-muted-foreground">Swipe · rate · discover</p>
      </header>
      <SwipeDeck locale={locale} />
    </main>
  );
}
