import { redirect } from "next/navigation";

// AI asistent je teď režim v „Hledat“.
export default async function AiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/discover?tab=ai`);
}
