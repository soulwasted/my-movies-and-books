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
import { reportMovieDataAction } from "@/lib/actions";

const REASONS = [
  "wrong_description",
  "wrong_title",
  "wrong_people",
  "other",
] as const;

type Reason = (typeof REASONS)[number];

export function ReportDataDialog({
  tmdbId,
  open,
  onOpenChange,
  onReported,
}: {
  tmdbId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported?: () => void;
}) {
  const t = useTranslations("report");
  const [reason, setReason] = useState<Reason>("wrong_description");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reportMovieDataAction({ tmdbId, reason, note: note || undefined });
      setDone(true);
      onReported?.();
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
        setNote("");
        setReason("wrong_description");
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="py-4 text-sm text-emerald-500">{t("thanks")}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    reason === r
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-primary"
                  />
                  {t(`reason_${r}`)}
                </label>
              ))}
            </div>

            <Textarea
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </>
        )}

        {!done && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={loading}>
              {t("submit")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
