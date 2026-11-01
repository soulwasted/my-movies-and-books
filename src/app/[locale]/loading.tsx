"use client";

import { useTranslations } from "next-intl";
import { ElapsedLoader } from "@/components/elapsed-loader";

/** Okamžitá odezva při přechodu mezi stránkami, než server dopočítá dynamickou routu. */
export default function Loading() {
  const t = useTranslations("common");
  const label = t("loading");

  // `steps` drží jen jeden řádek, ať styly s ukázkovými hláškami nemluví o AI tipech.
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
      <ElapsedLoader label={label} steps={[label]} />
    </main>
  );
}
