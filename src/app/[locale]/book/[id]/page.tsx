import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getBookDetails,
  bookYear,
  coverUrl,
  isGoogleBooksConfigured,
} from "@/lib/google-books";
import { resolveBookEnrichment } from "@/lib/book-enrichment";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { BookActions } from "@/components/book-actions";
import { AiBookRecommendPanel } from "@/components/ai-book-recommend-panel";
import { ReportBookButton } from "@/components/report-book-button";
import { ExternalLink } from "lucide-react";

function authorSlug(name: string): string {
  return encodeURIComponent(name);
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const volumeId = decodeURIComponent(id);
  if (!volumeId || !isGoogleBooksConfigured()) notFound();

  let book;
  try {
    book = await getBookDetails(volumeId);
  } catch {
    notFound();
  }

  let cached = await prisma.bookCache.findUnique({ where: { googleVolumeId: volumeId } });

  const stale =
    !cached?.enrichedAt ||
    Date.now() - cached.enrichedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

  let enrichment = null;
  if (!stale && cached?.czechTitle) {
    enrichment = {
      czechTitle: cached.czechTitle,
      openLibraryId: cached.openLibraryId,
      isbn13: cached.isbn13,
      wikidataId: cached.wikidataId,
      databazeKnihUrl: cached.databazeKnihUrl,
      coverUrl: null,
      enrichmentData: cached.enrichmentData,
    };
  }

  if (!enrichment || stale) {
    const rejectedIds: string[] = cached?.rejectedOlIds
      ? JSON.parse(cached.rejectedOlIds)
      : [];

    enrichment = await resolveBookEnrichment(book, rejectedIds);

    await prisma.bookCache.upsert({
      where: { googleVolumeId: volumeId },
      create: {
        googleVolumeId: volumeId,
        data: JSON.stringify(book),
        isbn13: enrichment.isbn13,
        openLibraryId: enrichment.openLibraryId,
        czechTitle: enrichment.czechTitle,
        wikidataId: enrichment.wikidataId,
        databazeKnihUrl: enrichment.databazeKnihUrl,
        enrichmentData: enrichment.enrichmentData,
        rejectedOlIds: JSON.stringify(rejectedIds),
        enrichedAt: new Date(),
      },
      update: {
        data: JSON.stringify(book),
        isbn13: enrichment.isbn13,
        openLibraryId: enrichment.openLibraryId,
        czechTitle: enrichment.czechTitle,
        wikidataId: enrichment.wikidataId,
        databazeKnihUrl: enrichment.databazeKnihUrl,
        enrichmentData: enrichment.enrichmentData,
        enrichedAt: new Date(),
      },
    });
  }

  const userBook = await prisma.userBook.findUnique({
    where: { userId_googleVolumeId: { userId, googleVolumeId: volumeId } },
  });

  const t = await getTranslations("book");
  const displayTitle = enrichment?.czechTitle ?? book.title;
  const poster = coverUrl(book.cover) ?? enrichment?.coverUrl;
  const year = bookYear(book.publishedDate);

  return (
    <main className="flex flex-1 flex-col pb-24">
      <div className="relative aspect-[16/9] w-full bg-muted">
        {poster && (
          <Image
            src={poster}
            alt={displayTitle}
            fill
            className="object-cover opacity-60"
            priority
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 p-4">
          <h1 className="text-2xl font-bold">{displayTitle}</h1>
          {book.authors.length > 0 && (
            <p className="text-sm text-muted-foreground">{book.authors.join(", ")}</p>
          )}
        </div>
      </div>

      <div className="space-y-6 px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {book.categories.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {year && (
            <div>
              <span className="text-muted-foreground">{t("year")}: </span>
              {year}
            </div>
          )}
          {book.pageCount && (
            <div>
              <span className="text-muted-foreground">{t("pages")}: </span>
              {book.pageCount}
            </div>
          )}
          {book.publisher && (
            <div>
              <span className="text-muted-foreground">{t("publisher")}: </span>
              {book.publisher}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {book.averageRating != null && (
            <Badge variant="outline">★ {book.averageRating.toFixed(1)}</Badge>
          )}
          {enrichment?.databazeKnihUrl && (
            <a
              href={enrichment.databazeKnihUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("databazeKnih")} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {book.infoLink && (
            <a
              href={book.infoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Google Books <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {enrichment?.czechTitle && enrichment.czechTitle !== book.title && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t("czechTitle")}: </span>
            {enrichment.czechTitle}
          </div>
        )}

        <p className="text-sm leading-relaxed text-muted-foreground">{book.description}</p>

        {book.authors.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">{t("authors")}</h2>
            <div className="flex flex-wrap gap-2">
              {book.authors.map((author) => (
                <Link
                  key={author}
                  href={`/${locale}/author/${authorSlug(author)}`}
                  className="text-sm text-primary hover:underline"
                >
                  {author}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <BookActions googleVolumeId={volumeId} userBook={userBook} locale={locale} />
          <ReportBookButton googleVolumeId={volumeId} />
        </div>

        <AiBookRecommendPanel
          locale={locale as "cs" | "en"}
          bookTitle={displayTitle}
          bookAuthor={book.authors[0] ?? ""}
        />
      </div>
    </main>
  );
}
