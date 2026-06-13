"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportBookDataAction } from "@/lib/actions";

const REASONS = [
  "wrong_description",
  "wrong_title",
  "wrong_author",
  "other",
] as const;

type Reason = (typeof REASONS)[number];

export function ReportBookDialog({
  googleVolumeId,
  open,
  onOpenChange,
  onReported,
}: {
  googleVolumeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported?: () => void;
}) {
  const t = useTranslations("bookReport");
  const [reason, setReason] = useState<Reason>("wrong_description");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reportBookDataAction({ googleVolumeId, reason, note });
      setDone(true);
      onReported?.();
      setTimeout(() => {
        setDone(false);
        onOpenChange(false);
        setNote("");
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="text-sm text-emerald-600">{t("thanks")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={reason === r ? "default" : "outline"}
                  onClick={() => setReason(r)}
                >
                  {t(`reason_${r}`)}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          {!done && (
            <Button onClick={submit} disabled={loading}>
              {t("submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
