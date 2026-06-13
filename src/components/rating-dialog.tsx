"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import {
  MAX_SCALE,
  formatScale,
  normalizeToScale,
  starFillLevel,
  starsToScale,
} from "@/lib/rating";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScale?: number;
  initialRatingType?: "STARS" | "SCALE";
  onSave: (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => void | Promise<void>;
};

export function RatingDialog({
  open,
  onOpenChange,
  onSave,
  initialScale,
  initialRatingType,
}: Props) {
  const t = useTranslations("swipe");
  const [ratingType, setRatingType] = useState<"STARS" | "SCALE">("STARS");
  const [scale, setScale] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRatingType(initialRatingType ?? "STARS");
      setScale(initialScale ?? null);
    }
  }, [open, initialScale, initialRatingType]);

  const handleSave = async () => {
    if (scale === null || scale < 1) return;
    setSaving(true);
    try {
      await onSave({
        rating: scale,
        ratingType,
        notes: notes || undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      setScale(null);
      setNotes("");
      setTags("");
    } finally {
      setSaving(false);
    }
  };

  const setStars = (stars: number) => setScale(starsToScale(stars));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rateTitle")}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={ratingType}
          onValueChange={(v) => setRatingType(v as "STARS" | "SCALE")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="STARS">{t("stars")}</TabsTrigger>
            <TabsTrigger value="SCALE">{t("scale")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {ratingType === "STARS" ? (
          <div className="space-y-2 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const fill = scale != null ? starFillLevel(scale, n) : 0;
                const selected = scale != null && scale >= starsToScale(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    className={cn(
                      "rounded p-1 transition-transform hover:scale-110",
                      selected && "ring-1 ring-amber-400/50",
                    )}
                    aria-label={`${n} ${t("stars")}`}
                  >
                    <span className="relative inline-block">
                      <Star className="h-8 w-8 text-muted-foreground/40" />
                      {fill > 0 && (
                        <Star
                          className="absolute inset-0 h-8 w-8 fill-amber-400 text-amber-400"
                          style={
                            fill === 0.5
                              ? { clipPath: "inset(0 50% 0 0)" }
                              : undefined
                          }
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {scale != null && (
              <p className="text-center text-xs text-muted-foreground">
                {formatScale(scale)} · {Math.round((scale / MAX_SCALE) * 100)} %
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 py-4">
            <div className="flex items-center justify-center gap-4">
              <input
                type="range"
                min={0}
                max={MAX_SCALE}
                value={scale ?? 0}
                onChange={(e) => setScale(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <span className="w-10 text-2xl font-bold tabular-nums">
                {scale ?? 0}
              </span>
            </div>
            {scale != null && scale > 0 && (
              <div className="flex justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const fill = starFillLevel(scale, n);
                  return (
                    <span key={n} className="relative inline-block">
                      <Star className="h-5 w-5 text-muted-foreground/40" />
                      {fill > 0 && (
                        <Star
                          className="absolute inset-0 h-5 w-5 fill-amber-400 text-amber-400"
                          style={
                            fill === 0.5
                              ? { clipPath: "inset(0 50% 0 0)" }
                              : undefined
                          }
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor="tags">{t("tags")}</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || scale === null || scale < 1}
          className="w-full"
        >
          {t("save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
