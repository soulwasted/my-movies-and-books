// ČSFD je za Anubisem, který zkouší jen klienty s prohlížečovým User-Agentem.
// Poctivě identifikovaná appka projde bez challenge; za prohlížeč se nevydáváme.
const USER_AGENT = "MediaDiary/1.0 (+https://github.com/soulwasted/my-movies-and-books)";

/**
 * Aktuální hodnocení přímo z ČSFD (v procentech, zaokrouhlené jako na webu).
 * CZDB drží jen snímek z doby, kdy film stáhlo, a hodnocení už neaktualizuje.
 */
export async function fetchCsfdRating(csfdUrl: string | null | undefined): Promise<number | null> {
  if (!csfdUrl || !/^https:\/\/www\.csfd\.cz\/film\//.test(csfdUrl)) return null;

  try {
    const res = await fetch(csfdUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html", "Accept-Language": "cs" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return parseCsfdRating(await res.text());
  } catch {
    // Best-effort jako CZDB: výpadek ČSFD nesmí zdržet kartu filmu.
    return null;
  }
}

export function parseCsfdRating(html: string): number | null {
  // JSON-LD má přesnou hodnotu, HTML blok je záloha pro případ změny schématu.
  const ld = html.match(/"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*([\d.]+)/);
  const value = ld
    ? parseFloat(ld[1])
    : parseFloat(html.match(/class="film-rating-average[^"]*">\s*(\d{1,3})\s*%/)?.[1] ?? "");
  return Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
}
