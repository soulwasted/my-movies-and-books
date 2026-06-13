import { searchBooks, isGoogleBooksConfigured } from "@/lib/google-books";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const author = searchParams.get("author") ?? undefined;
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  const locale = searchParams.get("locale") === "en" ? "en" : "cs";

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  if (!isGoogleBooksConfigured()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchBooks(q, {
      author,
      year: year && !isNaN(year) ? year : undefined,
      langRestrict: locale === "cs" ? "cs" : undefined,
    });
    return NextResponse.json({ results: data.results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
