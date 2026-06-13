import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LibraryGrid } from "@/components/library-grid";
import { BookLibraryGrid } from "@/components/book-library-grid";
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

  const [userMovies, userBooks] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.userBook.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const watched = userMovies.filter((m) => m.status === "WATCHED");
  const want = userMovies.filter((m) => m.status === "WANT");
  const history = userMovies;

  const read = userBooks.filter((b) => b.status === "READ");
  const wantBooks = userBooks.filter((b) => b.status === "WANT");
  const bookHistory = userBooks;

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <h1 className="text-2xl font-bold">{t("all")}</h1>

      <Tabs defaultValue="movies" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movies">{t("movies")}</TabsTrigger>
          <TabsTrigger value="books">{t("books")}</TabsTrigger>
        </TabsList>

        <TabsContent value="movies" className="mt-4">
          <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">
                {t("history")} ({history.length})
              </TabsTrigger>
              <TabsTrigger value="watched">
                {t("watched")} ({watched.length})
              </TabsTrigger>
              <TabsTrigger value="want">
                {t("want")} ({want.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <p className="text-muted-foreground">{t("historyEmpty")}</p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{t("historyHint")}</p>
                  <LibraryGrid items={history} locale={locale} showStatus />
                </>
              )}
            </TabsContent>
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
        </TabsContent>

        <TabsContent value="books" className="mt-4">
          <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">
                {t("history")} ({bookHistory.length})
              </TabsTrigger>
              <TabsTrigger value="read">
                {t("read")} ({read.length})
              </TabsTrigger>
              <TabsTrigger value="wantRead">
                {t("wantRead")} ({wantBooks.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              {bookHistory.length === 0 ? (
                <p className="text-muted-foreground">{t("bookHistoryEmpty")}</p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{t("bookHistoryHint")}</p>
                  <BookLibraryGrid items={bookHistory} locale={locale} showStatus />
                </>
              )}
            </TabsContent>
            <TabsContent value="read" className="mt-4">
              {read.length === 0 ? (
                <p className="text-muted-foreground">{t("bookEmpty")}</p>
              ) : (
                <BookLibraryGrid items={read} locale={locale} />
              )}
            </TabsContent>
            <TabsContent value="wantRead" className="mt-4">
              {wantBooks.length === 0 ? (
                <p className="text-muted-foreground">{t("bookEmpty")}</p>
              ) : (
                <BookLibraryGrid items={wantBooks} locale={locale} />
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </main>
  );
}
