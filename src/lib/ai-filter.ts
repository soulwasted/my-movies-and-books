import type { AiMovieRecommendation, AiStructuredResponse } from "@/lib/ai";
import { isTitleExcluded, resolveMovieTmdbId } from "@/lib/resolve-movie";

export async function filterAiResponse(
  response: AiStructuredResponse,
  excludedTmdbIds: Set<number>,
  excludedTitles: Array<{ title: string; year: number }>,
): Promise<AiStructuredResponse> {
  const kept: AiMovieRecommendation[] = [];

  for (const rec of response.recommendations) {
    if (isTitleExcluded(rec.title, rec.year, excludedTitles)) continue;

    const tmdbId = await resolveMovieTmdbId(rec.title, rec.year);
    if (tmdbId && excludedTmdbIds.has(tmdbId)) continue;

    kept.push(rec);
  }

  return { ...response, recommendations: kept };
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
