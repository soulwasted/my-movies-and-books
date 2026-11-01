import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPersonDetails, getPersonCraftFilms, profileUrl, posterUrl, isTmdbConfigured } from "@/lib/tmdb";
import { explainPersonFilms, formatAiResponseText } from "@/lib/ai";
import { FavoritePersonButton } from "@/components/favorite-person-button";
import { MovieTile } from "@/components/movie-card-view";
import { TILE_GRID } from "@/components/media-tile";
import { Bookmark, Check } from "lucide-react";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const personId = parseInt(id, 10);
  if (isNaN(personId) || !isTmdbConfigured()) notFound();

  let person;
  try {
    person = await getPersonDetails(personId, locale === "cs" ? "cs-CZ" : "en-US");
  } catch {
    notFound();
  }

  const t = await getTranslations("person");
  const [userMovies, favorite] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId },
      select: { tmdbId: true, status: true },
    }),
    prisma.favoritePerson.findUnique({
      where: { userId_tmdbPersonId: { userId, tmdbPersonId: personId } },
      select: { id: true },
    }),
  ]);
  const userMap = new Map(userMovies.map((m) => [m.tmdbId, m.status]));

  // Nejdřív tvorba v jeho profesi, pak ostatní účast (produkce, cameo, dokumenty o něm).
  const craft = getPersonCraftFilms(person);
  const allCredits = [
    ...craft,
    ...(person.movie_credits?.crew ?? []),
    ...(person.movie_credits?.cast ?? []),
  ];
  const uniqueMovies = new Map<number, (typeof allCredits)[0]>();
  for (const m of allCredits) {
    if (!uniqueMovies.has(m.id)) uniqueMovies.set(m.id, m);
  }

  const craftIds = new Set(craft.map((c) => c.id));
  const byDate = (a: (typeof allCredits)[0], b: (typeof allCredits)[0]) =>
    (b.release_date ?? "").localeCompare(a.release_date ?? "");
  const mainFilms = [...uniqueMovies.values()].filter((f) => craftIds.has(f.id)).sort(byDate);
  const otherFilms = [...uniqueMovies.values()]
    .filter((f) => !craftIds.has(f.id))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const films = [...mainFilms, ...otherFilms];

  const unwatched = films
    .filter((f) => !userMap.has(f.id) || userMap.get(f.id) === "SKIPPED")
    .slice(0, 10)
    .map((f) => `${f.title} (${f.release_date?.slice(0, 4) ?? "?"})`);

  const aiTip =
    unwatched.length > 0
      ? formatAiResponseText(
          await explainPersonFilms(
            person.name,
            person.known_for_department,
            unwatched,
            locale as "cs" | "en",
          ),
        )
      : "";

  const photo = profileUrl(person.profile_path);
  const seenCount = films.filter((f) => userMap.get(f.id) === "WATCHED").length;
  const role = (film: (typeof films)[0]) =>
    "character" in film && film.character ? film.character : "job" in film ? film.job : null;

  const filmCard = (film: (typeof films)[0]) => {
    const status = userMap.get(film.id);
    return (
      <MovieTile
        key={film.id}
        movie={{
          tmdbId: film.id,
          czechTitle: film.title,
          poster: posterUrl(film.poster_path, "w342"),
          year: film.release_date?.slice(0, 4) ?? null,
        }}
        meta={role(film)}
        locale={locale}
        badge={
          (status === "WATCHED" || status === "WANT") && (
            <span className="flex size-6 items-center justify-center rounded-full bg-background/80 backdrop-blur">
              {status === "WATCHED" ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Bookmark className="size-3.5 fill-primary text-primary" />
              )}
            </span>
          )
        }
      />
    );
  };

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-8 sm:px-6">
      <div className="flex items-center gap-5">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-white/10 sm:size-32">
          {photo ? (
            <Image src={photo} alt={person.name} fill className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl text-muted-foreground">
              {person.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">{person.name}</h1>
          <p className="text-sm text-muted-foreground">
            {person.known_for_department}
            {seenCount > 0 && (
              <span className="tabular-nums"> · {t("seen", { seen: seenCount, total: films.length })}</span>
            )}
          </p>
          <FavoritePersonButton
            person={{
              tmdbPersonId: person.id,
              name: person.name,
              profilePath: person.profile_path,
              department: person.known_for_department,
            }}
            initialFavorite={!!favorite}
          />
        </div>
      </div>

      {aiTip && (
        <section className="mt-8 rounded-xl border border-border/50 bg-card/50 p-4">
          <h2 className="mb-2 text-sm font-semibold">AI tip</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{aiTip}</p>
        </section>
      )}

      {[
        { key: "craft", label: t("films"), items: mainFilms },
        { key: "other", label: t("otherCredits"), items: otherFilms },
      ]
        .filter((g) => g.items.some((f) => f.poster_path))
        .map((g) => (
          <section key={g.key} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold">
              {g.label} <span className="font-normal text-muted-foreground tabular-nums">{g.items.length}</span>
            </h2>
            <div className={TILE_GRID}>
              {g.items
                .filter((f) => f.poster_path)
                .slice(0, g.key === "craft" ? 40 : 15)
                .map(filmCard)}
            </div>
          </section>
        ))}
    </main>
  );
}
