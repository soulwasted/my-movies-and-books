const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1";

export type GoogleBookListItem = {
  id: string;
  title: string;
  authors: string[];
  description: string;
  cover: string | null;
  publishedDate: string;
  categories: string[];
  pageCount: number | null;
  language: string | null;
  averageRating: number | null;
  isbn13: string | null;
};

export type GoogleBookDetail = GoogleBookListItem & {
  publisher: string | null;
  previewLink: string | null;
  infoLink: string | null;
};

type GoogleVolume = {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    categories?: string[];
    pageCount?: number;
    language?: string;
    averageRating?: number;
    publisher?: string;
    previewLink?: string;
    infoLink?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
};

type GoogleVolumesResponse = {
  items?: GoogleVolume[];
  totalItems?: number;
};

function extractIsbn13(volume: GoogleVolume): string | null {
  const ids = volume.volumeInfo.industryIdentifiers ?? [];
  const isbn13 = ids.find((i) => i.type === "ISBN_13");
  return isbn13?.identifier ?? null;
}

function extractCover(volume: GoogleVolume): string | null {
  const links = volume.volumeInfo.imageLinks;
  if (!links) return null;
  const url = links.medium ?? links.small ?? links.thumbnail ?? links.smallThumbnail;
  if (!url) return null;
  return url.replace("http://", "https://");
}

export function volumeToListItem(volume: GoogleVolume): GoogleBookListItem {
  const info = volume.volumeInfo;
  return {
    id: volume.id,
    title: info.title ?? "Unknown",
    authors: info.authors ?? [],
    description: info.description ?? "",
    cover: extractCover(volume),
    publishedDate: info.publishedDate ?? "",
    categories: info.categories ?? [],
    pageCount: info.pageCount ?? null,
    language: info.language ?? null,
    averageRating: info.averageRating ?? null,
    isbn13: extractIsbn13(volume),
  };
}

export function volumeToDetail(volume: GoogleVolume): GoogleBookDetail {
  const base = volumeToListItem(volume);
  const info = volume.volumeInfo;
  return {
    ...base,
    publisher: info.publisher ?? null,
    previewLink: info.previewLink ?? null,
    infoLink: info.infoLink ?? null,
  };
}

async function googleBooksFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Books API key not configured");
  }

  const url = new URL(`${GOOGLE_BOOKS_BASE}${path}`);
  url.searchParams.set("key", apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Google Books error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

export function coverUrl(cover: string | null, size: "small" | "medium" = "medium") {
  if (!cover) return null;
  if (size === "small") {
    return cover.replace("zoom=1", "zoom=2");
  }
  return cover;
}

export function bookYear(publishedDate: string): string | null {
  const match = publishedDate.match(/\d{4}/);
  return match ? match[0] : null;
}

export async function searchBooks(
  query: string,
  options?: { author?: string; year?: number; langRestrict?: string; maxResults?: number },
): Promise<{ results: GoogleBookListItem[] }> {
  let q = query.trim();
  if (options?.author) {
    q = `${q} inauthor:${options.author}`;
  }
  if (options?.year) {
    q = `${q} ${options.year}`;
  }

  const params: Record<string, string> = {
    q,
    maxResults: String(options?.maxResults ?? 20),
    printType: "books",
  };
  if (options?.langRestrict) {
    params.langRestrict = options.langRestrict;
  }

  const data = await googleBooksFetch<GoogleVolumesResponse>("/volumes", params);
  return {
    results: (data.items ?? []).map(volumeToListItem),
  };
}

export async function getBookDetails(volumeId: string): Promise<GoogleBookDetail> {
  const volume = await googleBooksFetch<GoogleVolume>(`/volumes/${encodeURIComponent(volumeId)}`);
  return volumeToDetail(volume);
}

export async function discoverBooks(options: {
  subjects?: string[];
  page?: number;
  langRestrict?: string;
}): Promise<{ results: GoogleBookListItem[] }> {
  const subject = options.subjects?.length
    ? options.subjects[Math.floor(Math.random() * options.subjects.length)]
    : "subject:fiction";

  const startIndex = ((options.page ?? 1) - 1) * 20;

  const params: Record<string, string> = {
    q: subject,
    maxResults: "20",
    startIndex: String(startIndex),
    orderBy: "relevance",
    printType: "books",
  };
  if (options.langRestrict) {
    params.langRestrict = options.langRestrict;
  }

  const data = await googleBooksFetch<GoogleVolumesResponse>("/volumes", params);
  return {
    results: (data.items ?? []).map(volumeToListItem),
  };
}

export async function searchBooksByAuthor(
  authorName: string,
  maxResults = 30,
): Promise<{ results: GoogleBookListItem[] }> {
  return searchBooks(`inauthor:"${authorName}"`, { maxResults });
}

export function isGoogleBooksConfigured() {
  return Boolean(process.env.GOOGLE_BOOKS_API_KEY);
}

/** Demo books when Google Books is not configured */
export const DEMO_BOOKS: GoogleBookListItem[] = [
  {
    id: "demo-1",
    title: "1984",
    authors: ["George Orwell"],
    description:
      "A dystopian social science fiction novel about totalitarian surveillance and thought control.",
    cover: "https://books.google.com/books/content?id=kotPYEqx7kMC&printsec=frontcover&img=1&zoom=1",
    publishedDate: "1949",
    categories: ["Fiction", "Dystopian"],
    pageCount: 328,
    language: "en",
    averageRating: 4.5,
    isbn13: "9780451524935",
  },
  {
    id: "demo-2",
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    description:
      "A fantasy novel about Bilbo Baggins, a hobbit who embarks on an unexpected journey.",
    cover: "https://books.google.com/books/content?id=pD6arNyKyi8C&printsec=frontcover&img=1&zoom=1",
    publishedDate: "1937",
    categories: ["Fiction", "Fantasy"],
    pageCount: 310,
    language: "en",
    averageRating: 4.7,
    isbn13: "9780547928227",
  },
];
