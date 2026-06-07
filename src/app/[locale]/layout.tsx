import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { routing } from "@/i18n/routing";
import { AppNav } from "@/components/app-nav";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "cs" | "en")) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const { userId } = await auth();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col">
        {children}
        {userId && <AppNav locale={locale} />}
      </div>
    </NextIntlClientProvider>
  );
}
