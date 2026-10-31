import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding-client";
import { prisma } from "@/lib/db";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  // Úprava z Nastavení: předvyplnit dosavadní výběr místo prázdného formuláře.
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });

  return (
    <OnboardingClient
      locale={locale}
      initialGenreIds={prefs ? (JSON.parse(prefs.favoriteGenreIds) as number[]) : []}
      initialCategoryIds={prefs ? (JSON.parse(prefs.favoriteBookCategoryIds) as string[]) : []}
    />
  );
}
