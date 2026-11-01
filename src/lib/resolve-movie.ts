import { searchMovies, type TmdbMovieListItem } from "@/lib/tmdb";

/**
 * Vybere film, jehož název (anglický nebo originální) přesně odpovídá dotazu
 * (bez diakritiky a členu); mezi shodami s rokem ±1 vyhrává popularita. Bez shody názvu nic —
 * dřív se bral první výsledek a AI tip „Mother“ skončil jako jiný film.
 */
export function pickBestMatch(
  results: TmdbMovieListItem[],
  year: number,
  query: string,
): TmdbMovieListItem | null {
  const key = (t: string) => normalizeTitle(t.replace(/^(the|a|an)\s+/i, ""));
  const q = key(query);
  if (!q) return null;
  const matches = results
    .filter((r) => [r.title, r.original_title].some((t) => key(t ?? "") === q))
    .map((r) => {
      const y = parseInt(r.release_date?.slice(0, 4) ?? "", 10);
      return { r, diff: Number.isFinite(y) ? Math.abs(y - year) : 99 };
    })
    .filter((m) => m.diff <= 2)
    // Rok ±1 je jedna skupina (festival vs. kino); v ní vyhrává popularita.
    .sort(
      (a, b) =>
        Number(a.diff > 1) - Number(b.diff > 1) || (b.r.popularity ?? 0) - (a.r.popularity ?? 0),
    );
  return matches[0]?.r ?? null;
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
  /** Další názvy, originální první (AI v češtině vrací v `title` český název). */
  alternatives: Array<string | null | undefined> = [],
): Promise<number | null> {
  const queries = [...alternatives, title]
    .flatMap((t) => (t ? [cleanTitle(t, year), t.trim()] : []))
    .filter((q, i, arr) => q && arr.indexOf(q) === i);

  // Anglické / originální názvy → en-US, nejdřív bez filtru roku (TMDB primary_release_year
  // se u festivalových filmů liší od „známého“ roku). Nakonec cs-CZ pro české názvy.
  const attempts: Array<[number | undefined, string]> = [
    [undefined, "en-US"],
    [year, "en-US"],
    [undefined, "cs-CZ"],
  ];
  for (const [yearFilter, language] of attempts) {
    for (const query of queries) {
      try {
        const data = await searchMovies(query, yearFilter, language);
        const match = pickBestMatch(data.results, year, query);
        if (match) return match.id;
      } catch {
        /* zkusit další dotaz */
      }
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
