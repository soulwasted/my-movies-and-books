import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LibraryGrid } from "@/components/library-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("library");

  const userMovies = await prisma.userMovie.findMany({
    where: { userId, status: { in: ["WATCHED", "WANT"] } },
    orderBy: { updatedAt: "desc" },
  });

  const watched = userMovies.filter((m) => m.status === "WATCHED");
  const want = userMovies.filter((m) => m.status === "WANT");

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <h1 className="text-2xl font-bold">{t("all")}</h1>
      <Tabs defaultValue="watched" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="watched">{t("watched")} ({watched.length})</TabsTrigger>
          <TabsTrigger value="want">{t("want")} ({want.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="watched" className="mt-4">
          {watched.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <LibraryGrid items={watched} locale={locale} />
          )}
        </TabsContent>
        <TabsContent value="want" className="mt-4">
          {want.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <LibraryGrid items={want} locale={locale} />
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
