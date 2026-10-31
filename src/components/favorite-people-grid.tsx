import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { profileUrl } from "@/lib/tmdb";

type FavoritePerson = {
  tmdbPersonId: number;
  name: string;
  profilePath: string | null;
  department: string;
};

const DEPARTMENTS = ["Acting", "Directing", "Writing", "Sound"] as const;

export async function FavoritePeopleGrid({ people, locale }: { people: FavoritePerson[]; locale: string }) {
  const t = await getTranslations("person");
  const groups = [...DEPARTMENTS, "Other" as const]
    .map((dept) => ({
      dept,
      people: people.filter((p) =>
        dept === "Other" ? !(DEPARTMENTS as readonly string[]).includes(p.department) : p.department === dept,
      ),
    }))
    .filter((g) => g.people.length > 0);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.dept}>
          <h2 className="mb-3 text-sm font-semibold">
            {t(`dept_${g.dept}`)}{" "}
            <span className="font-normal text-muted-foreground tabular-nums">{g.people.length}</span>
          </h2>
          <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6">
            {g.people.map((p) => {
              const photo = profileUrl(p.profilePath);
              return (
                <Link key={p.tmdbPersonId} href={`/${locale}/person/${p.tmdbPersonId}`} className="text-center">
                  <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-muted ring-1 ring-white/5">
                    {photo ? (
                      <Image src={photo} alt="" fill className="object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-lg text-muted-foreground">
                        {p.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{p.name}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
