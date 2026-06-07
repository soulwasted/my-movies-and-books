import { searchMovies, isTmdbConfigured } from "@/lib/tmdb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  if (!isTmdbConfigured()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchMovies(q);
    return NextResponse.json({ results: data.results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
