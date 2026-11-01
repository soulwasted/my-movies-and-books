import { redirect } from "next/navigation";

// Knihovna je teď domovská stránka.
export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
