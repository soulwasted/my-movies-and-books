import type { AiMovieRecommendation, AiStructuredResponse } from "@/lib/ai";
import { isTitleExcluded, resolveMovieTmdbId } from "@/lib/resolve-movie";

export async function filterAiResponse(
  response: AiStructuredResponse,
  excludedTmdbIds: Set<number>,
  excludedTitles: Array<{ title: string; year: number }>,
): Promise<AiStructuredResponse> {
  // Dohledání v TMDB paralelně (dřív sekvenčně, 9 doporučení = 9+ requestů za sebou).
  const resolved = await Promise.all(
    response.recommendations.map(async (rec): Promise<AiMovieRecommendation | null> => {
      if (isTitleExcluded(rec.title, rec.year, excludedTitles)) return null;
      const tmdbId = await resolveMovieTmdbId(rec.title, rec.year);
      if (tmdbId && excludedTmdbIds.has(tmdbId)) return null;
      return tmdbId ? { ...rec, tmdbId } : rec;
    }),
  );

  return {
    ...response,
    recommendations: resolved.filter((r): r is AiMovieRecommendation => r !== null),
  };
}

export async function filterToCount(
  response: AiStructuredResponse,
  excludedTmdbIds: Set<number>,
  excludedTitles: Array<{ title: string; year: number }>,
  count: number,
): Promise<AiStructuredResponse> {
  const filtered = await filterAiResponse(response, excludedTmdbIds, excludedTitles);
  return {
    ...filtered,
    recommendations: filtered.recommendations.slice(0, count),
  };
}
