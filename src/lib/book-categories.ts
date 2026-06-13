export type BookCategory = {
  id: string;
  nameCs: string;
  nameEn: string;
  /** Google Books subject: query fragment */
  subject: string;
};

export const BOOK_CATEGORIES: BookCategory[] = [
  { id: "fiction", nameCs: "Beletrie", nameEn: "Fiction", subject: "subject:fiction" },
  { id: "scifi", nameCs: "Sci-fi & fantasy", nameEn: "Sci-Fi & Fantasy", subject: "subject:science fiction" },
  { id: "mystery", nameCs: "Detektivky", nameEn: "Mystery", subject: "subject:mystery" },
  { id: "romance", nameCs: "Romány", nameEn: "Romance", subject: "subject:romance" },
  { id: "history", nameCs: "Historické", nameEn: "History", subject: "subject:history" },
  { id: "biography", nameCs: "Biografie", nameEn: "Biography", subject: "subject:biography" },
  { id: "nonfiction", nameCs: "Odborná literatura", nameEn: "Non-fiction", subject: "subject:nonfiction" },
  { id: "poetry", nameCs: "Poezie", nameEn: "Poetry", subject: "subject:poetry" },
  { id: "young", nameCs: "Mladá literatura", nameEn: "Young Adult", subject: "subject:young adult" },
  { id: "thriller", nameCs: "Thrillery", nameEn: "Thriller", subject: "subject:thriller" },
  { id: "horror", nameCs: "Horor", nameEn: "Horror", subject: "subject:horror" },
  { id: "philosophy", nameCs: "Filozofie", nameEn: "Philosophy", subject: "subject:philosophy" },
];

export function getBookCategories(locale: "cs" | "en") {
  return BOOK_CATEGORIES.map((c) => ({
    id: c.id,
    name: locale === "cs" ? c.nameCs : c.nameEn,
    subject: c.subject,
  }));
}

export function getCategorySubjects(ids: string[]): string[] {
  const set = new Set(ids);
  return BOOK_CATEGORIES.filter((c) => set.has(c.id)).map((c) => c.subject);
}

export function getCategoryNames(ids: string[], locale: "cs" | "en"): string[] {
  const set = new Set(ids);
  return BOOK_CATEGORIES.filter((c) => set.has(c.id)).map((c) =>
    locale === "cs" ? c.nameCs : c.nameEn,
  );
}
