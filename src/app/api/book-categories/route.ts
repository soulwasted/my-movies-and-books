import { getBookCategories } from "@/lib/book-categories";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "cs";
  return NextResponse.json({ categories: getBookCategories(locale) });
}
