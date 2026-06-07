import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DiscoverClient } from "@/components/discover-client";

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("discover");

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DiscoverClient locale={locale} />
    </main>
  );
}
