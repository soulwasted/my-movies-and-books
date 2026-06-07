"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDataDialog } from "@/components/report-data-dialog";

export function ReportMovieButton({ tmdbId }: { tmdbId: number }) {
  const t = useTranslations("report");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        {t("button")}
      </Button>
      <ReportDataDialog
        tmdbId={tmdbId}
        open={open}
        onOpenChange={setOpen}
        onReported={() => router.refresh()}
      />
    </>
  );
}
