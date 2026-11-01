import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { LibraryGrid } from "@/components/library-grid";
import { BookLibraryGrid } from "@/components/book-library-grid";
import { FavoritePeopleGrid } from "@/components/favorite-people-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { booksEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";

export async function LibraryView({ locale, userId }: { locale: string; userId: string }) {
  const t = await getTranslations("library");

  const [userMovies, userBooks, people] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.userBook.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.favoritePerson.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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

      <Link
        href={`/${locale}/discover?tab=tips`}
        className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-muted"
      >
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">{t("tipTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("tipSubtitle")}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <Tabs defaultValue="movies" className="mt-4">
        <TabsList className={cn("grid w-full", booksEnabled ? "grid-cols-3" : "grid-cols-2")}>
          <TabsTrigger value="movies">{t("movies")}</TabsTrigger>
          {booksEnabled && <TabsTrigger value="books">{t("books")}</TabsTrigger>}
          <TabsTrigger value="people">
            {t("people")} ({people.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movies" className="mt-4">
          <Tabs defaultValue="want">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="want">
                {t("want")} ({want.length})
              </TabsTrigger>
              <TabsTrigger value="watched">
                {t("watched")} ({watched.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                {t("history")} ({history.length})
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

        {booksEnabled && (
        <TabsContent value="books" className="mt-4">
          <Tabs defaultValue="wantRead">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="wantRead">
                {t("wantRead")} ({wantBooks.length})
              </TabsTrigger>
              <TabsTrigger value="read">
                {t("read")} ({read.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                {t("history")} ({bookHistory.length})
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
        )}

        <TabsContent value="people" className="mt-4">
          {people.length === 0 ? (
            <p className="text-muted-foreground">{t("peopleEmpty")}</p>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted-foreground">{t("peopleHint")}</p>
              <FavoritePeopleGrid people={people} locale={locale} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
