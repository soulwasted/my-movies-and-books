/**
 * Vypínače funkcí. `NEXT_PUBLIC_*` se vkládá při buildu, takže platí na serveru i v klientu.
 *
 * Knihy jsou vypnuté, dokud Google Books API neodpovídá (klíč vrací 403). Mrtvá funkce
 * na hlavní ploše bere důvěru všemu ostatnímu (ISA-kompas ISC-K11). Kód ani data se nemažou:
 * `NEXT_PUBLIC_BOOKS_ENABLED=true` je vrátí všude.
 */
export const booksEnabled = process.env.NEXT_PUBLIC_BOOKS_ENABLED === "true";
