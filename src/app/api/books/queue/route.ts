import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getCategorySubjects } from "@/lib/book-categories";
import {
  discoverBooks,
  isGoogleBooksConfigured,
  DEMO_BOOKS,
  type GoogleBookListItem,
} from "@/lib/google-books";
import { NextResponse } from "next/server";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "cs";

  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const categoryIds: string[] = prefs?.favoriteBookCategoryIds
    ? JSON.parse(prefs.favoriteBookCategoryIds)
    : [];

  const existing = await prisma.userBook.findMany({
    where: { userId },
    select: { googleVolumeId: true },
  });
  const exclude = new Set(existing.map((e) => e.googleVolumeId));

  let pool: GoogleBookListItem[] = [];

  if (!isGoogleBooksConfigured()) {
    pool = DEMO_BOOKS.filter((b) => !exclude.has(b.id));
    return NextResponse.json({ books: pool });
  }

  try {
    const subjects = getCategorySubjects(categoryIds);
    const page = Math.floor(Math.random() * 5) + 1;
    const sources = await Promise.all([
      discoverBooks({ subjects: subjects.length ? subjects : ["subject:fiction"], page, langRestrict: locale === "cs" ? "cs" : undefined }),
      discoverBooks({ subjects: ["subject:fiction"], page: page + 1 }),
      discoverBooks({ subjects: ["subject:science fiction"], page }),
      discoverBooks({ subjects: ["subject:biography"], page: page + 2 }),
    ]);

    const merged = new Map<string, GoogleBookListItem>();
    for (const source of sources) {
      for (const book of source.results) {
        if (!exclude.has(book.id)) merged.set(book.id, book);
      }
    }

    pool = shuffle([...merged.values()]).slice(0, 20);

    if (pool.length === 0) {
      const fallback = await discoverBooks({ subjects: ["subject:fiction"], page: 1 });
      pool = fallback.results.filter((b) => !exclude.has(b.id)).slice(0, 20);
    }
  } catch {
    pool = DEMO_BOOKS.filter((b) => !exclude.has(b.id));
  }

  if (pool.length === 0) {
    pool = DEMO_BOOKS.filter((b) => !exclude.has(b.id));
  }

  return NextResponse.json({ books: pool });
}
