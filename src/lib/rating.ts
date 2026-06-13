export const MAX_SCALE = 10;
export const MAX_STARS = 5;

/** 5 hvězd = 100 % = 10/10 → jedna hvězda = 20 % = 2 body */
export function starsToScale(stars: number): number {
  return Math.max(0, Math.min(MAX_SCALE, Math.round(stars * 2)));
}

export function scaleToStars(scale: number): number {
  return Math.max(0, Math.min(MAX_STARS, scale / 2));
}

/** Převede uložené hodnocení na kanonickou škálu 0–10 (zpětná kompatibilita se starým STARS 1–5). */
export function normalizeToScale(
  rating: number,
  ratingType?: "STARS" | "SCALE" | string | null,
): number {
  if (ratingType === "STARS" && rating <= MAX_STARS) {
    return starsToScale(rating);
  }
  return Math.max(0, Math.min(MAX_SCALE, rating));
}

export function starFillLevel(scale: number, starIndex: number): 0 | 0.5 | 1 {
  const threshold = starIndex * 2;
  if (scale >= threshold) return 1;
  if (scale >= threshold - 1) return 0.5;
  return 0;
}

export function formatScale(scale: number): string {
  return `${Math.round(scale)}/${MAX_SCALE}`;
}

export function formatStars(scale: number): string {
  const stars = scaleToStars(scale);
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1);
}
