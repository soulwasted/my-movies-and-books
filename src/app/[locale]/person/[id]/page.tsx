import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { getPersonDetails, profileUrl, isTmdbConfigured } from "@/lib/tmdb";
import { explainPersonFilms } from "@/lib/ai";
import { Badge } from "@/components/ui/badge";

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

  const userMovies = await prisma.userMovie.findMany({
    where: { userId },
    select: { tmdbId: true, status: true },
  });
  const userMap = new Map(userMovies.map((m) => [m.tmdbId, m.status]));

  const allCredits = [
    ...(person.movie_credits?.crew ?? []),
    ...(person.movie_credits?.cast ?? []),
  ];
  const uniqueMovies = new Map<number, (typeof allCredits)[0]>();
  for (const m of allCredits) {
    if (!uniqueMovies.has(m.id)) uniqueMovies.set(m.id, m);
  }

  const films = [...uniqueMovies.values()].sort(
    (a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""),
  );

  const unwatched = films
    .filter((f) => !userMap.has(f.id) || userMap.get(f.id) === "SKIPPED")
    .slice(0, 10)
    .map((f) => `${f.title} (${f.release_date?.slice(0, 4) ?? "?"})`);

  const aiTip =
    unwatched.length > 0
      ? await explainPersonFilms(
          person.name,
          person.known_for_department,
          unwatched,
          locale as "cs" | "en",
        )
      : "";

  const photo = profileUrl(person.profile_path);

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <div className="flex gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
          {photo && <Image src={photo} alt={person.name} fill className="object-cover" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{person.name}</h1>
          <p className="text-sm text-muted-foreground">{person.known_for_department}</p>
        </div>
      </div>

      {aiTip && (
        <section className="mt-6 rounded-xl border border-border/50 bg-card/50 p-4">
          <h2 className="mb-2 text-sm font-semibold">AI tip</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{aiTip}</p>
        </section>
      )}

      <h2 className="mb-3 mt-6 font-semibold">Filmy</h2>
      <div className="space-y-2">
        {films.slice(0, 30).map((film) => {
          const status = userMap.get(film.id);
          return (
            <Link
              key={film.id}
              href={`/${locale}/movie/${film.id}`}
              className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 hover:bg-muted/50"
            >
              <span className="text-sm">
                {film.title}{" "}
                <span className="text-muted-foreground">
                  ({film.release_date?.slice(0, 4)})
                </span>
              </span>
              {status === "WATCHED" && (
                <Badge variant="secondary" className="text-xs">
                  ✓
                </Badge>
              )}
              {status === "WANT" && (
                <Badge variant="outline" className="text-xs">
                  ♥
                </Badge>
              )}
              {!status && (
                <Badge variant="outline" className="text-xs text-primary">
                  new
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
