import type { GoogleBookDetail } from "@/lib/google-books";
import { searchBooks } from "@/lib/google-books";
import {
  searchBooksByTitle,
  searchBooksByIsbn,
  isbnCoverUrl,
  olCoverUrl,
  isValidOlMatch,
  type OlBookResult,
} from "@/lib/openlibrary";

export type BookEnrichment = {
  czechTitle: string | null;
  openLibraryId: string | null;
  isbn13: string | null;
  wikidataId: string | null;
  databazeKnihUrl: string | null;
  coverUrl: string | null;
  enrichmentData: string | null;
};

function databazeKnihSearchUrl(title: string): string {
  return `https://www.databaze-knih.cz/search?q=${encodeURIComponent(title)}`;
}

async function fetchCzechTitleFromGoogle(
  title: string,
  author?: string,
): Promise<string | null> {
  try {
    const { results } = await searchBooks(title, {
      author,
      langRestrict: "cs",
      maxResults: 3,
    });
    const match = results.find(
      (r) => r.language === "cs" || r.title.toLowerCase() !== title.toLowerCase(),
    );
    return match?.title ?? null;
  } catch {
    return null;
  }
}

async function fetchWikidataCzechTitle(
  isbn13: string | null,
  title: string,
): Promise<{ wikidataId: string | null; czechTitle: string | null }> {
  if (!isbn13 && !title) return { wikidataId: null, czechTitle: null };

  const query = isbn13
    ? `SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q571 . ?item wdt:P212 "${isbn13}" . SERVICE wikibase:label { bd:serviceParam wikibase:language "cs,en". } } LIMIT 1`
    : `SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q571 . ?item rdfs:label "${title.replace(/"/g, '\\"')}"@en . SERVICE wikibase:label { bd:serviceParam wikibase:language "cs,en". } } LIMIT 1`;

  try {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "MediaDiary/1.0",
      },
      body: `query=${encodeURIComponent(query)}`,
      next: { revalidate: 604800 },
    });
    if (!res.ok) return { wikidataId: null, czechTitle: null };

    const data = (await res.json()) as {
      results?: {
        bindings?: Array<{
          item?: { value: string };
          itemLabel?: { value: string };
        }>;
      };
    };

    const binding = data.results?.bindings?.[0];
    if (!binding?.item?.value) return { wikidataId: null, czechTitle: null };

    const wikidataId = binding.item.value.split("/").pop() ?? null;
    const label = binding.itemLabel?.value ?? null;
    const czechTitle =
      label && label !== title ? label : null;

    return { wikidataId, czechTitle };
  } catch {
    return { wikidataId: null, czechTitle: null };
  }
}

function olToEnrichment(ol: OlBookResult): Partial<BookEnrichment> {
  const isbn13 = ol.isbn?.find((i) => i.length === 13) ?? ol.isbn?.[0] ?? null;
  return {
    openLibraryId: ol.key.replace("/works/", "").replace("/books/", ""),
    isbn13,
    coverUrl: ol.cover_i ? olCoverUrl(ol.cover_i) : isbn13 ? isbnCoverUrl(isbn13) : null,
    enrichmentData: JSON.stringify(ol),
  };
}

export async function resolveBookEnrichment(
  book: GoogleBookDetail,
  rejectedOlIds: string[] = [],
): Promise<BookEnrichment> {
  const author = book.authors[0];
  const year = parseInt(book.publishedDate?.slice(0, 4) ?? "0", 10) || undefined;

  let czechTitle: string | null =
    book.language === "cs" ? book.title : await fetchCzechTitleFromGoogle(book.title, author);

  let ol: OlBookResult | null = null;
  if (book.isbn13) {
    ol = await searchBooksByIsbn(book.isbn13);
  }
  if (!ol) {
    ol = await searchBooksByTitle(book.title, author, year);
  }

  if (ol && rejectedOlIds.includes(ol.key)) {
    ol = null;
  }
  if (ol && !isValidOlMatch(ol, { title: book.title, author, year, isbn13: book.isbn13 ?? undefined })) {
    ol = null;
  }

  const olPartial = ol ? olToEnrichment(ol) : {};

  const wikidata = await fetchWikidataCzechTitle(
    book.isbn13 ?? olPartial.isbn13 ?? null,
    book.title,
  );

  if (!czechTitle && wikidata.czechTitle) {
    czechTitle = wikidata.czechTitle;
  }

  const searchTitle = czechTitle ?? book.title;

  return {
    czechTitle,
    openLibraryId: olPartial.openLibraryId ?? null,
    isbn13: book.isbn13 ?? olPartial.isbn13 ?? null,
    wikidataId: wikidata.wikidataId,
    databazeKnihUrl: databazeKnihSearchUrl(searchTitle),
    coverUrl: olPartial.coverUrl ?? null,
    enrichmentData: olPartial.enrichmentData ?? null,
  };
}
