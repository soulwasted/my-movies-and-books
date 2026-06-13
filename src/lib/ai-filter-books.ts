import type { AiBookRecommendation, AiBookStructuredResponse } from "@/lib/ai-books";
import { isBookTitleExcluded, resolveBookVolumeId } from "@/lib/resolve-book";

export async function filterBookResponse(
  response: AiBookStructuredResponse,
  excludedVolumeIds: Set<string>,
  excludedTitles: Array<{ title: string; author: string; year: number }>,
): Promise<AiBookStructuredResponse> {
  const kept: AiBookRecommendation[] = [];

  for (const rec of response.recommendations) {
    if (isBookTitleExcluded(rec.title, rec.author, rec.year, excludedTitles)) continue;

    const volumeId = await resolveBookVolumeId(rec.title, rec.author, rec.year);
    if (volumeId && excludedVolumeIds.has(volumeId)) continue;

    kept.push(rec);
  }

  return { ...response, recommendations: kept };
}

export async function filterBookToCount(
  response: AiBookStructuredResponse,
  excludedVolumeIds: Set<string>,
  excludedTitles: Array<{ title: string; author: string; year: number }>,
  count: number,
): Promise<AiBookStructuredResponse> {
  const filtered = await filterBookResponse(response, excludedVolumeIds, excludedTitles);
  return {
    ...filtered,
    recommendations: filtered.recommendations.slice(0, count),
  };
}
