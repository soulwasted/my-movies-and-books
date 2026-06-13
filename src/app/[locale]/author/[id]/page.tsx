import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import {
  findAuthorByName,
  getAuthorDetails,
  getAuthorBio,
  authorPhotoUrl,
} from "@/lib/openlibrary";
import {
  searchBooksByAuthor,
  isGoogleBooksConfigured,
  bookYear,
} from "@/lib/google-books";
import {
  explainAuthorBooks,
  formatBookAiResponseText,
} from "@/lib/ai-books";
import { Badge } from "@/components/ui/badge";

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const authorId = decodeURIComponent(id);
  const isOlKey = authorId.startsWith("OL") && authorId.endsWith("A");

  let authorName = authorId;
  let authorBio = "";
  let photoUrl: string | null = null;

  if (isOlKey) {
    const olAuthor = await getAuthorDetails(authorId);
    if (olAuthor) {
      authorName = olAuthor.name;
      authorBio = getAuthorBio(olAuthor);
      if (olAuthor.photos?.[0]) {
        photoUrl = authorPhotoUrl(olAuthor.photos[0]);
      }
    }
  } else {
    authorName = authorId;
    const olAuthor = await findAuthorByName(authorName);
    if (olAuthor) {
      authorBio = getAuthorBio(olAuthor);
      if (olAuthor.photos?.[0]) {
        photoUrl = authorPhotoUrl(olAuthor.photos[0]);
      }
    }
  }

  if (!authorName) notFound();

  const userBooks = await prisma.userBook.findMany({
    where: { userId },
    select: { googleVolumeId: true, status: true },
  });
  const userMap = new Map(userBooks.map((b) => [b.googleVolumeId, b.status]));

  let books: Awaited<ReturnType<typeof searchBooksByAuthor>>["results"] = [];
  if (isGoogleBooksConfigured()) {
    try {
      const data = await searchBooksByAuthor(authorName);
      books = data.results;
    } catch {
      books = [];
    }
  }

  const unread = books
    .filter((b) => !userMap.has(b.id) || userMap.get(b.id) === "SKIPPED")
    .slice(0, 10)
    .map((b) => `${b.title} (${bookYear(b.publishedDate) ?? "?"})`);

  const aiTip =
    unread.length > 0
      ? formatBookAiResponseText(
          await explainAuthorBooks(authorName, unread, locale as "cs" | "en"),
        )
      : "";

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <div className="flex gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
          {photoUrl && (
            <Image src={photoUrl} alt={authorName} fill className="object-cover" unoptimized />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{authorName}</h1>
          {authorBio && (
            <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{authorBio}</p>
          )}
        </div>
      </div>

      {aiTip && (
        <section className="mt-6 rounded-xl border border-border/50 bg-card/50 p-4">
          <h2 className="mb-2 text-sm font-semibold">
            {locale === "cs" ? "AI tip" : "AI tip"}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{aiTip}</p>
        </section>
      )}

      <h2 className="mb-3 mt-6 font-semibold">
        {locale === "cs" ? "Knihy" : "Books"}
      </h2>
      <div className="space-y-2">
        {books.slice(0, 30).map((book) => {
          const status = userMap.get(book.id);
          return (
            <Link
              key={book.id}
              href={`/${locale}/book/${encodeURIComponent(book.id)}`}
              className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 hover:bg-muted/50"
            >
              <span className="text-sm">
                {book.title}{" "}
                <span className="text-muted-foreground">
                  ({bookYear(book.publishedDate) ?? "?"})
                </span>
              </span>
              {status === "READ" && (
                <Badge variant="secondary" className="text-xs">
                  ✓
                </Badge>
              )}
              {status === "WANT" && (
                <Badge variant="outline" className="text-xs">
                  ♥
                </Badge>
              )}
              {!status && (
                <Badge variant="outline" className="text-xs text-primary">
                  new
                </Badge>
              )}
            </Link>
          );
        })}
        {books.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {locale === "cs" ? "Žádné knihy nenalezeny." : "No books found."}
          </p>
        )}
      </div>
    </main>
  );
}
