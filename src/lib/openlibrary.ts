const OL_SEARCH = "https://openlibrary.org/search.json";
const OL_API = "https://openlibrary.org";

export type OlBookResult = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  language?: string[];
};

export type OlAuthor = {
  key: string;
  name: string;
  bio?: string | { value: string };
  birth_date?: string;
  death_date?: string;
  photos?: number[];
};

type OlSearchResponse = {
  docs?: OlBookResult[];
};

async function olFetch<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "MediaDiary/1.0" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export function isbnCoverUrl(isbn13: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
}

export function olCoverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

export function authorPhotoUrl(photoId: number): string {
  return `https://covers.openlibrary.org/a/olid/${photoId}-L.jpg`;
}

export async function searchBooksByTitle(
  title: string,
  author?: string,
  year?: number,
): Promise<OlBookResult | null> {
  const params = new URLSearchParams({ title, limit: "5" });
  if (author) params.set("author", author);
  if (year) params.set("first_publish_year", String(year));

  const data = await olFetch<OlSearchResponse>(`${OL_SEARCH}?${params}`);
  if (!data?.docs?.length) return null;

  if (year) {
    const byYear = data.docs.find((d) => d.first_publish_year === year);
    if (byYear) return byYear;
    const near = data.docs.find(
      (d) => d.first_publish_year && Math.abs(d.first_publish_year - year) <= 1,
    );
    if (near) return near;
  }

  return data.docs[0];
}

export async function searchBooksByIsbn(isbn13: string): Promise<OlBookResult | null> {
  const data = await olFetch<OlSearchResponse>(
    `${OL_SEARCH}?isbn=${encodeURIComponent(isbn13)}&limit=1`,
  );
  return data?.docs?.[0] ?? null;
}

export async function getAuthorDetails(olAuthorId: string): Promise<OlAuthor | null> {
  const key = olAuthorId.startsWith("/") ? olAuthorId : `/authors/${olAuthorId}`;
  const data = await olFetch<OlAuthor>(`${OL_API}${key}.json`);
  return data;
}

export async function findAuthorByName(name: string): Promise<OlAuthor | null> {
  const data = await olFetch<OlSearchResponse>(
    `${OL_SEARCH}?author=${encodeURIComponent(name)}&limit=1`,
  );
  const doc = data?.docs?.[0];
  if (!doc?.author_name?.[0]) return null;

  const searchRes = await olFetch<{ docs: Array<{ key: string; name: string }> }>(
    `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=1`,
  );
  const authorKey = searchRes?.docs?.[0]?.key;
  if (!authorKey) return null;

  return getAuthorDetails(authorKey.replace("/authors/", ""));
}

export function getAuthorBio(author: OlAuthor): string {
  if (!author.bio) return "";
  if (typeof author.bio === "string") return author.bio;
  return author.bio.value ?? "";
}

export function isValidOlMatch(
  ol: OlBookResult,
  expected: { title: string; author?: string; year?: number; isbn13?: string },
): boolean {
  if (expected.isbn13 && ol.isbn?.includes(expected.isbn13)) return true;

  const olTitle = ol.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const expTitle = expected.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!olTitle.includes(expTitle.slice(0, Math.min(expTitle.length, 12))) && !expTitle.includes(olTitle.slice(0, 12))) {
    return false;
  }

  if (expected.author && ol.author_name?.length) {
    const authorLower = expected.author.toLowerCase();
    const hasAuthor = ol.author_name.some((a) =>
      a.toLowerCase().includes(authorLower.split(" ").pop() ?? authorLower),
    );
    if (!hasAuthor) return false;
  }

  if (expected.year && ol.first_publish_year) {
    if (Math.abs(ol.first_publish_year - expected.year) > 2) return false;
  }

  return true;
}
