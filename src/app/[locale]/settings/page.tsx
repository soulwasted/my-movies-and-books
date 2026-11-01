import { redirect } from "next/navigation";

// Statistiky i nastavení jsou teď pod „Já“.
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/me`);
}
