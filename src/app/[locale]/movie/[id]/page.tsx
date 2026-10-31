import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getMovieDetails,
  getDirectors,
  getWriters,
  getComposers,
  getTrailers,
  getSimilarMovies,
  getCzechTitle,
  getEnglishTitle,
  posterUrl,
  backdropUrl,
  profileUrl,
  formatRuntime,
  imdbUrl,
  isTmdbConfigured,
} from "@/lib/tmdb";
import {
  resolveCzdbForMovie,
  parseCzdbRating,
  parseRuntimeMinutes,
  czdbTrailers,
  splitPeople,
  isValidCzdbMatch,
  normalizeCzdbFilm,
  type CzdbFilm,
} from "@/lib/czdb";
import { fetchCsfdRating } from "@/lib/csfd";
import { prisma } from "@/lib/db";
import { MovieActions } from "@/components/movie-actions";
import { AiRecommendPanel } from "@/components/ai-recommend-panel";
import { ReportMovieButton } from "@/components/report-movie-button";
import { ExternalLink, Play } from "lucide-react";

export default async function MoviePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId) || !isTmdbConfigured()) notFound();

  let movie;
  try {
    movie = await getMovieDetails(tmdbId, locale === "cs" ? "cs-CZ" : "en-US");
  } catch {
    notFound();
  }

  const year = movie.release_date?.slice(0, 4);
  let cached = await prisma.movieCache.findUnique({ where: { tmdbId } });
  let czdb: CzdbFilm | null = cached?.czdbData ? normalizeCzdbFilm(JSON.parse(cached.czdbData)) : null;

  const tmdbTitles = [movie.title, movie.original_title, getEnglishTitle(movie), getCzechTitle(movie)];
  if (czdb && !isValidCzdbMatch(czdb, { tmdbId, imdbId: movie.imdb_id, year, titles: tmdbTitles })) {
    czdb = null;
  }

  const stale =
    !cached?.csfdUpdated ||
    Date.now() - cached.csfdUpdated.getTime() > 7 * 24 * 60 * 60 * 1000;

  let freshCsfdRating = cached?.csfdRating ?? null;

  if (!czdb || stale) {
    const rejectedIds: number[] = cached?.rejectedCzdbIds
      ? JSON.parse(cached.rejectedCzdbIds)
      : [];

    czdb = await resolveCzdbForMovie({
      title: movie.title,
      originalTitle: movie.original_title,
      extraTitles: [getEnglishTitle(movie), getCzechTitle(movie)],
      year,
      imdbId: movie.imdb_id,
      tmdbId,
      rejectedIds,
    });
    if (czdb) {
      freshCsfdRating =
        (await fetchCsfdRating(czdb.csfd_url)) ?? parseCzdbRating(czdb.hodnoceni);
      await prisma.movieCache.upsert({
        where: { tmdbId },
        create: {
          tmdbId,
          data: JSON.stringify(movie),
          csfdRating: freshCsfdRating,
          csfdUrl: czdb.csfd_url,
          czdbId: czdb.id,
          czdbData: JSON.stringify(czdb),
          csfdUpdated: new Date(),
        },
        update: {
          csfdRating: freshCsfdRating,
          csfdUrl: czdb.csfd_url,
          czdbId: czdb.id,
          czdbData: JSON.stringify(czdb),
          csfdUpdated: new Date(),
        },
      });
    }
  }

  // Cache drží živé číslo z ČSFD; snímek z CZDB jen když ještě nic nemáme.
  const csfdRating = czdb ? (freshCsfdRating ?? parseCzdbRating(czdb.hodnoceni)) : cached?.csfdRating;
  const csfdUrl = czdb?.csfd_url ?? cached?.csfdUrl;

  const userMovie = await prisma.userMovie.findUnique({
    where: { userId_tmdbId: { userId, tmdbId } },
  });

  const t = await getTranslations("movie");
  const poster = posterUrl(movie.poster_path, "w500") ?? czdb?.obrazek_url;
  const directors = getDirectors(movie);
  const writers = getWriters(movie);
  const composers = getComposers(movie);
  const tmdbTrailers = getTrailers(movie);
  const czdbTrailerList = czdb ? czdbTrailers(czdb) : [];
  const czechTitle = czdb?.nazev ?? getCzechTitle(movie);
  const imdb = imdbUrl(movie.imdb_id);
  const runtime =
    movie.runtime ??
    (czdb ? parseRuntimeMinutes(czdb.cas) : null);

  const title = czechTitle ?? movie.title;
  const englishTitle = getEnglishTitle(movie);
  const backdrop = backdropUrl(movie.backdrop_path);
  const genres = [
    ...movie.genres.map((g) => g.name),
    ...(czdb?.zanr ? czdb.zanr.split(",").map((z) => z.trim()) : []),
  ].filter((g, i, all) => g && all.findIndex((x) => x.toLowerCase() === g.toLowerCase()) === i);
  const meta = [year ?? czdb?.rok, runtime ? formatRuntime(runtime, locale as "cs" | "en") : null].filter(
    Boolean,
  );

  const credits = [
    {
      label: t("director"),
      people: directors.length
        ? directors.map((d) => ({ key: d.id, name: d.name, href: `/${locale}/person/${d.id}` }))
        : splitPeople(czdb?.rezie).map((name) => ({ key: name, name })),
    },
    {
      label: t("writer"),
      people: writers.length
        ? writers.slice(0, 5).map((w) => ({ key: w.id, name: w.name }))
        : splitPeople(czdb?.scenar).map((name) => ({ key: name, name })),
    },
    {
      label: t("composer"),
      people: composers.length
        ? composers.map((c) => ({ key: c.id, name: c.name }))
        : czdb?.hudba && czdb.hudba !== "N/A"
          ? splitPeople(czdb.hudba).map((name) => ({ key: name, name }))
          : [],
    },
  ].filter((c) => c.people.length > 0);

  const cast = movie.credits.cast.length
    ? movie.credits.cast.slice(0, 12).map((c) => ({
        key: c.id,
        name: c.name,
        character: c.character,
        photo: profileUrl(c.profile_path),
        href: `/${locale}/person/${c.id}`,
      }))
    : splitPeople(czdb?.herci).map((name) => ({ key: name, name, character: undefined, photo: null, href: null }));

  const trailers = [
    ...tmdbTrailers.map((tr) => ({ key: tr.key, name: tr.name, url: `https://www.youtube.com/watch?v=${tr.key}` })),
    ...czdbTrailerList.map((tr) => ({ key: tr.url, name: `${tr.name} (CZDB)`, url: tr.url })),
  ];

  const similar = getSimilarMovies(movie);

  const pill =
    "inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium tabular-nums";

  return (
    <main className="flex flex-1 flex-col pb-24">
      {/* Hero: backdrop přes celou šířku okna (vylamuje se z max-w-2xl), bez backdropu rozmazaný plakát. */}
      <div className="relative left-1/2 h-[42svh] min-h-64 max-h-[560px] w-screen -translate-x-1/2 overflow-hidden bg-muted sm:h-[52svh]">
        {(backdrop ?? poster) && (
          <Image
            src={(backdrop ?? poster)!}
            alt=""
            fill
            priority
            className={backdrop ? "object-cover object-[center_25%]" : "scale-110 object-cover blur-2xl"}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--background)_100%)]" />
      </div>

      <div className="relative -mt-32 flex items-end gap-4 px-4 sm:-mt-48 sm:gap-6 sm:px-6">
        {poster && (
          <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 sm:w-36">
            <Image src={poster} alt={title} fill className="object-cover" />
          </div>
        )}
        <div className="min-w-0 pb-1">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">{title}</h1>
          {movie.original_title !== title && (
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{movie.original_title}</p>
          )}
          {meta.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground tabular-nums">{meta.join(" · ")}</p>
          )}
        </div>
      </div>

      <div className="space-y-8 px-4 pt-6 sm:px-6">
        <div className="space-y-4">
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <span key={g} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {movie.vote_average > 0 && <span className={pill}>TMDB {movie.vote_average.toFixed(1)}</span>}
            {csfdUrl ? (
              <a href={csfdUrl} target="_blank" rel="noopener noreferrer" className={`${pill} hover:bg-accent`}>
                ČSFD{csfdRating != null && ` ${csfdRating} %`}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ) : (
              csfdRating != null && <span className={pill}>ČSFD {csfdRating} %</span>
            )}
            {imdb && (
              <a href={imdb} target="_blank" rel="noopener noreferrer" className={`${pill} hover:bg-accent`}>
                {t("imdb")}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>
        </div>

        <MovieActions tmdbId={tmdbId} userMovie={userMovie} locale={locale} />

        {(czdb?.plot ?? movie.overview) && (
          <p className="text-[15px] leading-relaxed text-foreground/85 text-pretty">{czdb?.plot ?? movie.overview}</p>
        )}

        {(credits.length > 0 || (englishTitle && englishTitle !== title && englishTitle !== movie.original_title)) && (
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-3 text-sm">
            {credits.map((c) => (
              <div key={c.label} className="contents">
                <dt className="text-muted-foreground">{c.label}</dt>
                <dd>
                  {c.people.map((p, i) => (
                    <span key={p.key}>
                      {i > 0 && ", "}
                      {"href" in p && p.href ? (
                        <Link href={p.href} className="underline-offset-4 hover:underline">
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
            {englishTitle && englishTitle !== title && englishTitle !== movie.original_title && (
              <>
                <dt className="text-muted-foreground">{t("englishTitle")}</dt>
                <dd>{englishTitle}</dd>
              </>
            )}
          </dl>
        )}

        {cast.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">{t("cast")}</h2>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:none]">
              {cast.map((c) => {
                const body = (
                  <>
                    <div className="relative mx-auto size-16 overflow-hidden rounded-full bg-muted">
                      {c.photo ? (
                        <Image src={c.photo} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-lg text-muted-foreground">
                          {c.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{c.name}</p>
                    {c.character && (
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{c.character}</p>
                    )}
                  </>
                );
                return c.href ? (
                  <Link key={c.key} href={c.href} className="w-20 shrink-0 snap-start text-center">
                    {body}
                  </Link>
                ) : (
                  <div key={c.key} className="w-20 shrink-0 snap-start text-center">
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {trailers.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">{t("trailers")}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {trailers.map((tr) => (
                <li key={tr.key}>
                  <a
                    href={tr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent"
                  >
                    <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{tr.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {similar.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">{t("similar")}</h2>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {similar.map((m) => (
                <Link key={m.id} href={`/${locale}/movie/${m.id}`} className="group min-w-0">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted ring-1 ring-white/5">
                    <Image
                      src={posterUrl(m.poster_path, "w342")!}
                      alt={m.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug sm:text-xs">{m.title}</p>
                  {m.release_date && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">{m.release_date.slice(0, 4)}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <AiRecommendPanel locale={locale as "cs" | "en"} movieTitle={movie.title} />

        <div className="flex justify-end">
          <ReportMovieButton tmdbId={tmdbId} />
        </div>
      </div>
    </main>
  );
}
