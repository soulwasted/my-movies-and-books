import { getGenres, isTmdbConfigured } from "@/lib/tmdb";
import { NextResponse } from "next/server";

const FALLBACK_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 37, name: "Western" },
];

export async function GET() {
  try {
    if (!isTmdbConfigured()) {
      return NextResponse.json({ genres: FALLBACK_GENRES });
    }
    const genres = await getGenres();
    return NextResponse.json({ genres });
  } catch {
    return NextResponse.json({ genres: FALLBACK_GENRES });
  }
}
