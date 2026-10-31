import { describe, expect, test } from "bun:test";
import { pickBestMatch } from "@/lib/resolve-movie";
import type { TmdbMovieListItem } from "@/lib/tmdb";

function movie(id: number, title: string, release_date: string, popularity = 1, original_title = title) {
  return { id, title, original_title, release_date, popularity } as TmdbMovieListItem;
}

describe("pickBestMatch", () => {
  test("bez shody názvu nic nevrátí (dřív první výsledek)", () => {
    const results = [movie(37080, "Mother and Child", "2009-11-07")];
    expect(pickBestMatch(results, 2009, "Mother")).toBeNull();
  });

  test("shoda podle originálu i anglického názvu, vyhrává nejbližší rok", () => {
    const results = [
      movie(1, "Mother", "1996-12-25", 5),
      movie(30018, "Mother", "2009-05-28", 20, "마더"),
    ];
    expect(pickBestMatch(results, 2009, "Mother")?.id).toBe(30018);
  });

  test("rok ±1 je rovnocenný, rozhoduje popularita (ne obskurní stejnojmenný film)", () => {
    const results = [
      movie(698232, "Under the Skin", "2013-10-19", 0.5, "Sob a Pele"),
      movie(97370, "Under the Skin", "2014-03-14", 40),
    ];
    expect(pickBestMatch(results, 2013, "Under the Skin")?.id).toBe(97370);
  });

  test("vzdálený rok prohraje s blízkým i při vyšší popularitě", () => {
    const results = [movie(1, "Solaris", "2002-11-27", 50), movie(593, "Solaris", "1972-03-20", 10, "Солярис")];
    expect(pickBestMatch(results, 1972, "Solaris")?.id).toBe(593);
  });

  test("člen na začátku nevadí", () => {
    expect(pickBestMatch([movie(7, "Prophet", "2009-08-26")], 2009, "A Prophet")?.id).toBe(7);
  });

  test("diakritika a interpunkce se ignorují", () => {
    expect(pickBestMatch([movie(5, "Amélie", "2001-04-25")], 2001, "Amelie")?.id).toBe(5);
  });
});
