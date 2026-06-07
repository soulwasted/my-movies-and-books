import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ensureUser } from "@/lib/user";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  await ensureUser(userId);
  const user = await currentUser();

  const t = await getTranslations("settings");
  const tAuth = await getTranslations("auth");

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <section className="mt-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("language")}</p>
          <div className="mt-2 flex gap-2">
            <Link href="/cs/settings">
              <Badge variant={locale === "cs" ? "default" : "outline"}>Čeština</Badge>
            </Link>
            <Link href="/en/settings">
              <Badge variant={locale === "en" ? "default" : "outline"}>English</Badge>
            </Link>
          </div>
        </div>

        <div>
          <Link href={`/${locale}/onboarding`}>
            <Button variant="outline">{t("genres")}</Button>
          </Link>
        </div>

        <div>
          <Badge variant="secondary">{t("booksSoon")}</Badge>
        </div>

        {user?.imageUrl && (
          <div className="flex items-center gap-3 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.imageUrl} alt="" className="h-10 w-10 rounded-full" />
            <div>
              <p className="font-medium">
                {[user.firstName, user.lastName].filter(Boolean).join(" ")}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        )}

        <SignOutButton redirectUrl={`/${locale}/sign-in`}>
          <Button variant="destructive">{tAuth("signOut")}</Button>
        </SignOutButton>
      </section>
    </main>
  );
}
