import { searchMovies, type TmdbMovieListItem } from "@/lib/tmdb";

function pickBestMatch(
  results: TmdbMovieListItem[],
  year: number,
): TmdbMovieListItem | null {
  if (results.length === 0) return null;
  const byYear = results.find((r) => r.release_date?.startsWith(String(year)));
  if (byYear) return byYear;
  const nearYear = results.find((r) => {
    const y = parseInt(r.release_date?.slice(0, 4) ?? "0", 10);
    return y && Math.abs(y - year) <= 1;
  });
  return nearYear ?? results[0];
}

function cleanTitle(title: string, year: number): string {
  return title
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .replace(new RegExp(`\\s*${year}\\s*$`), "")
    .trim();
}

export async function resolveMovieTmdbId(
  title: string,
  year: number,
): Promise<number | null> {
  const queries = [cleanTitle(title, year), title.trim()].filter(
    (q, i, arr) => q && arr.indexOf(q) === i,
  );

  for (const query of queries) {
    try {
      const data = await searchMovies(query, year);
      const match = pickBestMatch(data.results, year);
      if (match) return match.id;
    } catch {
      /* try next query */
    }
  }

  for (const query of queries) {
    try {
      const data = await searchMovies(query);
      const match = pickBestMatch(data.results, year);
      if (match) return match.id;
    } catch {
      /* try next query */
    }
  }

  return null;
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function isTitleExcluded(
  title: string,
  year: number,
  excludedTitles: Array<{ title: string; year: number }>,
): boolean {
  const key = `${normalizeTitle(title)}|${year}`;
  return excludedTitles.some(
    (e) => `${normalizeTitle(e.title)}|${e.year}` === key,
  );
}
