import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ensureUser } from "@/lib/user";
import { AppearanceSettings } from "@/components/appearance-settings";
import { booksEnabled } from "@/lib/features";

export async function SettingsView({ locale, userId }: { locale: string; userId: string }) {
  await ensureUser(userId);
  const user = await currentUser();

  const t = await getTranslations("settings");
  const tAuth = await getTranslations("auth");

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

        <div>
          <p className="text-sm text-muted-foreground">{t("language")}</p>
          <div className="mt-2 flex gap-2">
            <Link href="/cs/me">
              <Badge variant={locale === "cs" ? "default" : "outline"}>Čeština</Badge>
            </Link>
            <Link href="/en/me">
              <Badge variant={locale === "en" ? "default" : "outline"}>English</Badge>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">{t("appearance")}</h2>
          <AppearanceSettings />
        </div>

        <div>
          <Link href={`/${locale}/onboarding`}>
            <Button variant="outline">{t("genres")}</Button>
          </Link>
        </div>

        {booksEnabled && (
          <div>
            <Link href={`/${locale}/onboarding`}>
              <Button variant="outline">{t("bookCategories")}</Button>
            </Link>
          </div>
        )}

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
  );
}
