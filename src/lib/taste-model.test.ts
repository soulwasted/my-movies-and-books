import { describe, expect, test } from "bun:test";
import {
  buildTasteModel,
  decisionSignal,
  rankQueue,
  scoreCandidate,
  type CandidateFeatures,
  type DecisionFeatures,
} from "@/lib/taste-model";

const SCIFI = 878;
const ROMANCE = 10749;
const DRAMA = 18;

function decision(partial: Partial<DecisionFeatures>): DecisionFeatures {
  return { status: "WATCHED", rating: null, genreIds: [], year: 2010, language: "en", ...partial };
}

function candidate(id: number, partial: Partial<CandidateFeatures> = {}): CandidateFeatures {
  return { id, genreIds: [], year: 2015, language: "en", voteAverage: 7, ...partial };
}

describe("decisionSignal", () => {
  test("Přeskočit a prošlo nabídkou jsou neutrální (ISC-12)", () => {
    expect(decisionSignal({ status: "SKIPPED", rating: null })).toBe(0);
    expect(decisionSignal({ status: "SEEN", rating: null })).toBe(0);
  });

  test("vysoké hodnocení kladné, nízké záporné, nezajímá záporné", () => {
    expect(decisionSignal({ status: "WATCHED", rating: 10 })).toBe(1);
    expect(decisionSignal({ status: "WATCHED", rating: 2 })).toBe(-1);
    expect(decisionSignal({ status: "WANT", rating: null })).toBeGreaterThan(0);
    expect(decisionSignal({ status: "NOT_INTERESTED", rating: null })).toBeLessThan(0);
  });
});

describe("buildTasteModel (ISC-14)", () => {
  test("9/10 zvedne žánr, Nezajímá mě ho sníží", () => {
    const model = buildTasteModel([
      decision({ rating: 9, genreIds: [SCIFI] }),
      decision({ status: "NOT_INTERESTED", genreIds: [ROMANCE] }),
    ]);
    expect(model.genres.get(SCIFI)!).toBeGreaterThan(0);
    expect(model.genres.get(ROMANCE)!).toBeLessThan(0);
  });

  test("přeskočené rozhodnutí model nezmění (ISC-12)", () => {
    const base = [decision({ rating: 9, genreIds: [SCIFI] })];
    const withSkip = [...base, decision({ status: "SKIPPED", genreIds: [SCIFI, ROMANCE] })];
    expect(buildTasteModel(withSkip)).toEqual(buildTasteModel(base));
  });

  test("jedno rozhodnutí váží méně než opakované (tlumení)", () => {
    const one = buildTasteModel([decision({ rating: 10, genreIds: [SCIFI] })]);
    const many = buildTasteModel(
      Array.from({ length: 6 }, () => decision({ rating: 10, genreIds: [SCIFI] })),
    );
    expect(many.genres.get(SCIFI)!).toBeGreaterThan(one.genres.get(SCIFI)!);
  });
});

describe("rankQueue", () => {
  const model = buildTasteModel([
    ...Array.from({ length: 5 }, () => decision({ rating: 9, genreIds: [SCIFI] })),
    ...Array.from({ length: 5 }, () => decision({ status: "NOT_INTERESTED", genreIds: [ROMANCE] })),
  ]);
  const candidates = [
    ...Array.from({ length: 20 }, (_, i) => candidate(100 + i, { genreIds: [SCIFI] })),
    ...Array.from({ length: 20 }, (_, i) => candidate(200 + i, { genreIds: [ROMANCE], voteAverage: 7.5 })),
    ...Array.from({ length: 10 }, (_, i) => candidate(300 + i, { genreIds: [DRAMA] })),
  ];

  test("jisté karty jsou seřazené sestupně podle skóre (ISC-15)", () => {
    const queue = rankQueue(model, candidates, { size: 20, exploreShare: 0.15, random: () => 0.5 });
    const sure = queue.filter((c) => !c.explore).map((c) => c.score);
    expect(sure).toEqual([...sure].sort((a, b) => b - a));
    expect(queue.slice(0, 3).every((c) => c.genreIds.includes(SCIFI))).toBe(true);
  });

  test("15 % fronty je objevování mimo bublinu (ISC-16)", () => {
    const queue = rankQueue(model, candidates, { size: 20, exploreShare: 0.15, random: () => 0.1 });
    expect(queue).toHaveLength(20);
    expect(queue.filter((c) => c.explore)).toHaveLength(3);
    expect(queue[0].explore).toBe(false);
  });

  test("bez duplicit", () => {
    const queue = rankQueue(model, [...candidates, ...candidates], { size: 20, exploreShare: 0.15 });
    expect(new Set(queue.map((c) => c.id)).size).toBe(queue.length);
  });

  test("strop karet z jednoho zdrojového filmu", () => {
    const fromOne = Array.from({ length: 15 }, (_, i) =>
      candidate(500 + i, { genreIds: [SCIFI], recommendedBecause: "Spider-Man" }),
    );
    const queue = rankQueue(model, [...fromOne, ...candidates], {
      size: 20,
      exploreShare: 0.15,
      maxPerSource: 4,
    });
    expect(queue.filter((c) => c.recommendedBecause === "Spider-Man")).toHaveLength(4);
  });

  test("doporučení z oblíbeného filmu má bonus", () => {
    const plain = scoreCandidate(model, candidate(1, { genreIds: [DRAMA] }));
    const recommended = scoreCandidate(model, candidate(2, { genreIds: [DRAMA], recommendedBecause: "Příchozí" }));
    expect(recommended.score).toBeGreaterThan(plain.score);
  });
});
