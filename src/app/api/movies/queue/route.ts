import { requireUserId } from "@/lib/user";
import { prisma } from "@/lib/db";
import {
  discoverMovies,
  getGenres,
  getMovieRecommendations,
  getTopRated,
  getTrending,
  isTmdbConfigured,
  DEMO_MOVIES,
  type TmdbMovieListItem,
} from "@/lib/tmdb";
import { normalizeToScale } from "@/lib/rating";
import { getTasteProfile } from "@/lib/taste-profile";
import {
  buildTasteModel,
  mixInAiTips,
  rankQueue,
  type CandidateFeatures,
  type DecisionFeatures,
  type DecisionStatus,
} from "@/lib/taste-model";
import type { QueueMovie, QueueReason } from "@/lib/queue-types";
import { NextResponse } from "next/server";

const QUEUE_SIZE = 20;
const EXPLORE_SHARE = 0.15;
/** Kolik oblíbených filmů použít jako zdroj TMDB doporučení. */
const SEED_COUNT = 4;

type Candidate = CandidateFeatures & { movie: TmdbMovieListItem };

function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function toCandidate(movie: TmdbMovieListItem, recommendedBecause?: string): Candidate {
  const year = parseInt(movie.release_date?.slice(0, 4) ?? "", 10);
  return {
    id: movie.id,
    genreIds: movie.genre_ids ?? [],
    year: Number.isFinite(year) ? year : null,
    language: movie.original_language ?? null,
    voteAverage: movie.vote_average ?? 0,
    recommendedBecause,
    movie,
  };
}

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [prefs, existing, profile] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.userMovie.findMany({
      where: { userId },
      select: { tmdbId: true, status: true, rating: true, ratingType: true, updatedAt: true },
    }),
    getTasteProfile(userId).catch(() => null),
  ]);
  // Každý film, který už fronta ukázala (i přeskočený), je venku: návrat přeskočených zatím není.
  const exclude = new Set(existing.map((e) => e.tmdbId));

  if (!isTmdbConfigured()) {
    return NextResponse.json({ movies: DEMO_MOVIES.filter((m) => !exclude.has(m.id)) });
  }

  // Rysy rozhodnutých filmů z cache detailů, rovnou v Postgresu (bez parsování celých JSONů).
  const decided = existing.filter((e) => ["WATCHED", "WANT", "NOT_INTERESTED"].includes(e.status));
  const features = decided.length
    ? await prisma.$queryRaw<
        Array<{ tmdbId: number; title: string | null; genres: Array<{ id: number }> | null; release_date: string | null; lang: string | null }>
      >`SELECT "tmdbId", data::jsonb ->> 'title' AS title, data::jsonb -> 'genres' AS genres,
               data::jsonb ->> 'release_date' AS release_date, data::jsonb ->> 'original_language' AS lang
        FROM "MovieCache" WHERE "tmdbId" = ANY(${decided.map((d) => d.tmdbId)}::int[])`
    : [];
  const featureById = new Map(features.map((f) => [f.tmdbId, f]));

  const decisions: DecisionFeatures[] = decided.flatMap((d) => {
    const f = featureById.get(d.tmdbId);
    if (!f) return [];
    const year = parseInt(f.release_date?.slice(0, 4) ?? "", 10);
    return [
      {
        status: d.status as DecisionStatus,
        rating: d.rating != null ? normalizeToScale(d.rating, d.ratingType) : null,
        genreIds: (f.genres ?? []).map((g) => g.id),
        year: Number.isFinite(year) ? year : null,
        language: f.lang,
      },
    ];
  });
  const model = buildTasteModel(decisions);

  // Zdroje kandidátů: doporučení k oblíbeným filmům, žánry z modelu (nebo z onboardingu), objevování.
  const favourites = decided
    .filter((d) => {
      const scale = d.rating != null ? normalizeToScale(d.rating, d.ratingType) : null;
      return (d.status === "WATCHED" && scale != null && scale >= 8) || d.status === "WANT";
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 15);
  const seeds = pickRandom(favourites, SEED_COUNT);

  const topGenres = [...model.genres.entries()]
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  const onboardingGenres: number[] = prefs?.favoriteGenreIds ? JSON.parse(prefs.favoriteGenreIds) : [];
  const genreIds = topGenres.length ? topGenres : onboardingGenres;
  const page = () => Math.floor(Math.random() * 3) + 1;

  const settle = <T,>(p: Promise<T>) => p.catch(() => null);
  const [seedResults, byGenre, topRated, trending, genreList] = await Promise.all([
    Promise.all(
      seeds.map(async (s) => ({
        title: featureById.get(s.tmdbId)?.title ?? null,
        results: (await settle(getMovieRecommendations(s.tmdbId)))?.results ?? [],
      })),
    ),
    settle(discoverMovies({ genreIds, page: page() })),
    settle(getTopRated(Math.floor(Math.random() * 10) + 1)),
    settle(getTrending(1)),
    settle(getGenres("cs-CZ")),
  ]);

  const candidates: Candidate[] = [];
  for (const seed of seedResults) {
    for (const m of seed.results) candidates.push(toCandidate(m, seed.title ?? undefined));
  }
  for (const m of [...(byGenre?.results ?? []), ...(topRated?.results ?? []), ...(trending?.results ?? [])]) {
    candidates.push(toCandidate(m));
  }
  // První výskyt vyhrává: kandidát z doporučení si nese důvod „protože se ti líbil“.
  const pool = candidates.filter(
    (c, i) => !exclude.has(c.id) && candidates.findIndex((x) => x.id === c.id) === i,
  );

  if (pool.length === 0) {
    return NextResponse.json({ movies: DEMO_MOVIES.filter((m) => !exclude.has(m.id)) });
  }

  const genreName = new Map((genreList ?? []).map((g) => [g.id, g.name]));
  const ranked = rankQueue(model, pool, {
    size: QUEUE_SIZE,
    exploreShare: EXPLORE_SHARE,
    maxPerSource: 4,
  });

  const movies: QueueMovie[] = ranked.map((c) => {
    let reason: QueueReason | undefined;
    if (c.explore) reason = { type: "explore" };
    else if (c.recommendedBecause) reason = { type: "because", title: c.recommendedBecause };
    else if (c.topGenreIds.length) {
      const names = c.topGenreIds.map((id) => genreName.get(id)).filter((n): n is string => !!n);
      if (names.length) reason = { type: "genres", names };
    }
    return { ...c.movie, reason };
  });

  // AI tipy z profilu, který Claude počítá na pozadí; tady se jen čtou z DB.
  const aiTips: QueueMovie[] = (profile?.picks ?? [])
    .filter((p) => !exclude.has(p.tmdbId))
    .map((p) => ({
      id: p.tmdbId,
      title: p.title,
      original_title: p.title,
      overview: "",
      poster_path: null,
      backdrop_path: null,
      release_date: String(p.year),
      vote_average: 0,
      genre_ids: [],
      reason: { type: "ai", text: p.reason },
    }));
  const mixed = mixInAiTips(movies, pickRandom(aiTips, aiTips.length), { max: 3 });

  return NextResponse.json({ movies: mixed, modelDecisions: model.decisionCount });
}
