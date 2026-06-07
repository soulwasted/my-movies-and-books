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
  getCzechTitle,
  posterUrl,
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
  type CzdbFilm,
} from "@/lib/czdb";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { MovieActions } from "@/components/movie-actions";
import { AiRecommendPanel } from "@/components/ai-recommend-panel";
import { ExternalLink } from "lucide-react";

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
  let czdb: CzdbFilm | null = cached?.czdbData ? JSON.parse(cached.czdbData) : null;

  if (!czdb) {
    czdb = await resolveCzdbForMovie({
      title: movie.title,
      year,
      imdbId: movie.imdb_id,
      tmdbId,
    });
    if (czdb) {
      await prisma.movieCache.upsert({
        where: { tmdbId },
        create: {
          tmdbId,
          data: JSON.stringify(movie),
          csfdRating: parseCzdbRating(czdb.hodnoceni),
          csfdUrl: czdb.csfd_url,
          czdbId: czdb.id,
          czdbData: JSON.stringify(czdb),
          csfdUpdated: new Date(),
        },
        update: {
          csfdRating: parseCzdbRating(czdb.hodnoceni),
          csfdUrl: czdb.csfd_url,
          czdbId: czdb.id,
          czdbData: JSON.stringify(czdb),
          csfdUpdated: new Date(),
        },
      });
    }
  }

  const csfdRating = czdb ? parseCzdbRating(czdb.hodnoceni) : cached?.csfdRating;
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

  return (
    <main className="flex flex-1 flex-col pb-24">
      <div className="relative aspect-[16/9] w-full bg-muted">
        {poster && (
          <Image
            src={poster}
            alt={movie.title}
            fill
            className="object-cover opacity-60"
            priority
            unoptimized={poster.startsWith("https://image.pmgstatic.com")}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 p-4">
          <h1 className="text-2xl font-bold">{czechTitle ?? movie.title}</h1>
          <p className="text-sm text-muted-foreground">{movie.original_title}</p>
        </div>
      </div>

      <div className="space-y-6 px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {movie.genres.map((g) => (
            <Badge key={g.id} variant="secondary">
              {g.name}
            </Badge>
          ))}
          {czdb?.zanr &&
            czdb.zanr.split(",").map((z) => (
              <Badge key={z} variant="outline">
                {z.trim()}
              </Badge>
            ))}
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t("year")}: </span>
            {year ?? czdb?.rok}
          </div>
          {runtime && (
            <div>
              <span className="text-muted-foreground">{t("runtime")}: </span>
              {formatRuntime(runtime, locale as "cs" | "en")}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge variant="outline">IMDb {movie.vote_average.toFixed(1)}</Badge>
          {csfdRating != null && <Badge variant="outline">ČSFD {csfdRating}%</Badge>}
          {imdb && (
            <a
              href={imdb}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("imdb")} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {csfdUrl && (
            <a
              href={csfdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("csfd")} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {czechTitle && czechTitle !== movie.title && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t("czechTitle")}: </span>
            {czechTitle}
          </div>
        )}

        <div className="text-sm">
          <span className="text-muted-foreground">{t("englishTitle")}: </span>
          {movie.title}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {czdb?.plot ?? movie.overview}
        </p>

        <section>
          <h2 className="mb-2 font-semibold">{t("director")}</h2>
          <div className="flex flex-wrap gap-2">
            {directors.map((d) => (
              <Link
                key={d.id}
                href={`/${locale}/person/${d.id}`}
                className="text-sm text-primary hover:underline"
              >
                {d.name}
              </Link>
            ))}
            {directors.length === 0 &&
              splitPeople(czdb?.rezie).map((name) => (
                <span key={name} className="text-sm">
                  {name}
                </span>
              ))}
          </div>
        </section>

        {(writers.length > 0 || czdb?.scenar) && (
          <section>
            <h2 className="mb-2 font-semibold">{t("writer")}</h2>
            <div className="flex flex-wrap gap-2">
              {writers.slice(0, 5).map((w) => (
                <span key={w.id} className="text-sm">
                  {w.name}
                </span>
              ))}
              {writers.length === 0 &&
                splitPeople(czdb?.scenar).map((name) => (
                  <span key={name} className="text-sm">
                    {name}
                  </span>
                ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-semibold">{t("cast")}</h2>
          <div className="flex flex-wrap gap-2">
            {(movie.credits.cast.length
              ? movie.credits.cast.slice(0, 8)
              : splitPeople(czdb?.herci).map((name, i) => ({ id: i, name }))
            ).map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/person/${c.id}`}
                className="text-sm text-primary hover:underline"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        {(composers.length > 0 || (czdb?.hudba && czdb.hudba !== "N/A")) && (
          <section>
            <h2 className="mb-2 font-semibold">{t("composer")}</h2>
            <div className="flex flex-wrap gap-2">
            {(composers.length ? composers : splitPeople(czdb?.hudba).map((name) => ({ id: name, name }))).map(
              (c) => (
                <span key={c.id} className="text-sm">
                  {c.name}
                </span>
              ),
            )}
            </div>
          </section>
        )}

        {(tmdbTrailers.length > 0 || czdbTrailerList.length > 0) && (
          <section>
            <h2 className="mb-2 font-semibold">{t("trailers")}</h2>
            <div className="flex flex-wrap gap-2">
              {tmdbTrailers.map((tr) => (
                <a
                  key={tr.key}
                  href={`https://www.youtube.com/watch?v=${tr.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {tr.name}
                </a>
              ))}
              {czdbTrailerList.map((tr) => (
                <a
                  key={tr.url}
                  href={tr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {tr.name} (CZDB)
                </a>
              ))}
            </div>
          </section>
        )}

        <MovieActions tmdbId={tmdbId} userMovie={userMovie} locale={locale} />

        <AiRecommendPanel locale={locale as "cs" | "en"} movieTitle={movie.title} />
      </div>
    </main>
  );
}
