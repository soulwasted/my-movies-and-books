"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportBookDialog } from "@/components/report-book-dialog";

export function ReportBookButton({ googleVolumeId }: { googleVolumeId: string }) {
  const t = useTranslations("bookReport");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        {t("button")}
      </Button>
      <ReportBookDialog
        googleVolumeId={googleVolumeId}
        open={open}
        onOpenChange={setOpen}
        onReported={() => router.refresh()}
      />
    </>
  );
}
