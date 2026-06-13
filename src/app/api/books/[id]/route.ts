import { getSessionUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getBookDetails, isGoogleBooksConfigured } from "@/lib/google-books";
import { resolveBookEnrichment } from "@/lib/book-enrichment";
import { buildBookCardSummary } from "@/lib/book-card";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const volumeId = decodeURIComponent(id);

  if (!volumeId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let cached = await prisma.bookCache.findUnique({ where: { googleVolumeId: volumeId } });
  let bookData = cached ? JSON.parse(cached.data) : null;

  if (!bookData && isGoogleBooksConfigured()) {
    try {
      bookData = await getBookDetails(volumeId);
      await prisma.bookCache.upsert({
        where: { googleVolumeId: volumeId },
        create: { googleVolumeId: volumeId, data: JSON.stringify(bookData) },
        update: { data: JSON.stringify(bookData) },
      });
    } catch {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
  }

  if (!bookData) {
    return NextResponse.json({ error: "Google Books not configured" }, { status: 503 });
  }

  const stale =
    !cached?.enrichedAt ||
    Date.now() - cached.enrichedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

  let enrichment = null;
  if (cached?.enrichmentData || cached?.czechTitle) {
    enrichment = {
      czechTitle: cached?.czechTitle ?? null,
      openLibraryId: cached?.openLibraryId ?? null,
      isbn13: cached?.isbn13 ?? null,
      wikidataId: cached?.wikidataId ?? null,
      databazeKnihUrl: cached?.databazeKnihUrl ?? null,
      coverUrl: null,
      enrichmentData: cached?.enrichmentData ?? null,
    };
  }

  if (stale || !enrichment) {
    const rejectedIds: string[] = cached?.rejectedOlIds
      ? JSON.parse(cached.rejectedOlIds)
      : [];

    enrichment = await resolveBookEnrichment(bookData, rejectedIds);

    await prisma.bookCache.upsert({
      where: { googleVolumeId: volumeId },
      create: {
        googleVolumeId: volumeId,
        data: JSON.stringify(bookData),
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

  const userId = await getSessionUserId();
  let userBook = null;
  if (userId) {
    userBook = await prisma.userBook.findUnique({
      where: { userId_googleVolumeId: { userId, googleVolumeId: volumeId } },
    });
  }

  return NextResponse.json({
    book: bookData,
    card: buildBookCardSummary(bookData, enrichment),
    enrichment,
    userBook,
  });
}
