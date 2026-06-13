import type { GoogleBookDetail } from "@/lib/google-books";
import { bookYear, coverUrl } from "@/lib/google-books";
import type { BookEnrichment } from "@/lib/book-enrichment";

export type BookCardSummary = {
  googleVolumeId: string;
  title: string;
  authors: string[];
  overview: string;
  cover: string | null;
  year: string | null;
  pageCount: number | null;
  categories: string[];
  czechTitle: string | null;
  externalUrl: string | null;
  averageRating: number | null;
};

export function buildBookCardSummary(
  book: GoogleBookDetail,
  enrichment: BookEnrichment | null,
): BookCardSummary {
  const displayTitle = enrichment?.czechTitle ?? book.title;

  return {
    googleVolumeId: book.id,
    title: displayTitle,
    authors: book.authors,
    overview: book.description,
    cover: coverUrl(book.cover) ?? enrichment?.coverUrl ?? null,
    year: bookYear(book.publishedDate),
    pageCount: book.pageCount,
    categories: book.categories,
    czechTitle: enrichment?.czechTitle ?? null,
    externalUrl: enrichment?.databazeKnihUrl ?? null,
    averageRating: book.averageRating,
  };
}
