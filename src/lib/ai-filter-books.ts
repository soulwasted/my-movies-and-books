import type { AiBookRecommendation, AiBookStructuredResponse } from "@/lib/ai-books";
import { isBookTitleExcluded, resolveBookVolumeId } from "@/lib/resolve-book";

export async function filterBookResponse(
  response: AiBookStructuredResponse,
  excludedVolumeIds: Set<string>,
  excludedTitles: Array<{ title: string; author: string; year: number }>,
): Promise<AiBookStructuredResponse> {
  const resolved = await Promise.all(
    response.recommendations.map(async (rec): Promise<AiBookRecommendation | null> => {
      if (isBookTitleExcluded(rec.title, rec.author, rec.year, excludedTitles)) return null;
      const volumeId = await resolveBookVolumeId(rec.title, rec.author, rec.year);
      if (volumeId && excludedVolumeIds.has(volumeId)) return null;
      return volumeId ? { ...rec, volumeId } : rec;
    }),
  );

  return {
    ...response,
    recommendations: resolved.filter((r): r is AiBookRecommendation => r !== null),
  };
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
