import { getSessionUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import { posterUrl } from "@/lib/tmdb";
import { NextResponse } from "next/server";

export type MovieMeta = { title: string; poster: string | null; year: string | null };

/**
 * Název, plakát a rok pro víc filmů najednou z cache detailů.
 * Knihovna dřív volala /api/movies/[id] pro každý film zvlášť (stovky requestů).
 * Filmy bez cache klient dotáhne jednotlivě.
 */
export async function POST(req: Request) {
  if (!(await getSessionUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown): id is number => Number.isInteger(id)).slice(0, 500)
    : [];
  if (ids.length === 0) return NextResponse.json({ meta: {} });

  // Jen potřebná pole přímo v Postgresu: celé detaily 200+ filmů jsou megabajty JSONu
  // a z Neonu v us-east trvaly ~5 s.
  const rows = await prisma.$queryRaw<
    Array<{
      tmdbId: number;
      title: string | null;
      cs_title: string | null;
      en_title: string | null;
      poster_path: string | null;
      release_date: string | null;
      czdb_title: string | null;
      czdb_tmdb_id: number | null;
      czdb_poster: string | null;
    }>
  >`SELECT "tmdbId",
      d ->> 'title' AS title,
      (SELECT t -> 'data' ->> 'title' FROM jsonb_array_elements(d -> 'translations' -> 'translations') t
        WHERE t ->> 'iso_639_1' = 'cs' AND t -> 'data' ->> 'title' <> '' LIMIT 1) AS cs_title,
      (SELECT t -> 'data' ->> 'title' FROM jsonb_array_elements(d -> 'translations' -> 'translations') t
        WHERE t ->> 'iso_639_1' = 'en' AND t -> 'data' ->> 'title' <> '' LIMIT 1) AS en_title,
      d ->> 'poster_path' AS poster_path,
      d ->> 'release_date' AS release_date,
      c ->> 'nazev' AS czdb_title,
      (c ->> 'tmdb_id')::int AS czdb_tmdb_id,
      c ->> 'obrazek_url' AS czdb_poster
    FROM (SELECT "tmdbId", data::jsonb AS d, NULLIF("czdbData", '')::jsonb AS c
          FROM "MovieCache" WHERE "tmdbId" = ANY(${ids}::int[])) x`;

  const meta: Record<number, MovieMeta> = {};
  for (const r of rows) {
    // Stejné pořadí jako karta: CZDB (jen když nepatří jinému filmu), čeština, angličtina, originál.
    const czdbOk = r.czdb_title && (r.czdb_tmdb_id == null || r.czdb_tmdb_id === r.tmdbId);
    meta[r.tmdbId] = {
      title: (czdbOk ? r.czdb_title : null) ?? r.cs_title ?? r.en_title ?? r.title ?? `#${r.tmdbId}`,
      poster: posterUrl(r.poster_path, "w342") ?? (czdbOk ? r.czdb_poster : null),
      year: r.release_date?.slice(0, 4) || null,
    };
  }

  return NextResponse.json({ meta });
}
