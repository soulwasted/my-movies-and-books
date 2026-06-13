import { searchBooks, type GoogleBookListItem } from "@/lib/google-books";
import { searchBooksByTitle } from "@/lib/openlibrary";

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeAuthor(author: string): string {
  return author
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function authorMatches(bookAuthors: string[], expectedAuthor: string): boolean {
  if (!expectedAuthor || bookAuthors.length === 0) return true;
  const parts = normalizeAuthor(expectedAuthor).split(/\s+/);
  const lastName = parts[parts.length - 1];
  return bookAuthors.some((a) => normalizeAuthor(a).includes(lastName));
}

function pickBestMatch(
  results: GoogleBookListItem[],
  year: number,
  author: string,
): GoogleBookListItem | null {
  if (results.length === 0) return null;

  const withAuthor = results.filter((r) => authorMatches(r.authors, author));
  const pool = withAuthor.length > 0 ? withAuthor : results;

  const byYear = pool.find((r) => r.publishedDate?.startsWith(String(year)));
  if (byYear) return byYear;

  const nearYear = pool.find((r) => {
    const y = parseInt(r.publishedDate?.slice(0, 4) ?? "0", 10);
    return y && Math.abs(y - year) <= 1;
  });
  return nearYear ?? pool[0];
}

function cleanTitle(title: string, year: number): string {
  return title
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .replace(new RegExp(`\\s*${year}\\s*$`), "")
    .trim();
}

export async function resolveBookVolumeId(
  title: string,
  author: string,
  year: number,
): Promise<string | null> {
  const queries = [cleanTitle(title, year), title.trim()].filter(
    (q, i, arr) => q && arr.indexOf(q) === i,
  );

  for (const query of queries) {
    try {
      const data = await searchBooks(query, { author, year });
      const match = pickBestMatch(data.results, year, author);
      if (match) return match.id;
    } catch {
      /* try next */
    }
  }

  for (const query of queries) {
    try {
      const data = await searchBooks(query, { author });
      const match = pickBestMatch(data.results, year, author);
      if (match) return match.id;
    } catch {
      /* try next */
    }
  }

  for (const query of queries) {
    try {
      const data = await searchBooks(query);
      const match = pickBestMatch(data.results, year, author);
      if (match) return match.id;
    } catch {
      /* try next */
    }
  }

  const ol = await searchBooksByTitle(title, author, year);
  if (ol?.isbn?.[0]) {
    try {
      const data = await searchBooks(`isbn:${ol.isbn[0]}`);
      const match = pickBestMatch(data.results, year, author);
      if (match) return match.id;
    } catch {
      /* fallback failed */
    }
  }

  return null;
}

export function isBookTitleExcluded(
  title: string,
  author: string,
  year: number,
  excluded: Array<{ title: string; author: string; year: number }>,
): boolean {
  const key = `${normalizeTitle(title)}|${normalizeAuthor(author)}|${year}`;
  return excluded.some(
    (e) => `${normalizeTitle(e.title)}|${normalizeAuthor(e.author)}|${e.year}` === key,
  );
}

export { normalizeTitle };
