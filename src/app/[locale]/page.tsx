import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LibraryView } from "@/components/library-view";

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

  return <LibraryView locale={locale} userId={userId} />;
}
