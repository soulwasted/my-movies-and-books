"use client";

import { useState } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    rating?: number;
    ratingType?: "STARS" | "SCALE";
    notes?: string;
    tags?: string[];
  }) => void | Promise<void>;
};

export function RatingDialog({ open, onOpenChange, onSave }: Props) {
  const t = useTranslations("swipe");
  const [ratingType, setRatingType] = useState<"STARS" | "SCALE">("STARS");
  const [stars, setStars] = useState(0);
  const [scale, setScale] = useState(7);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        rating: ratingType === "STARS" ? stars : scale,
        ratingType,
        notes: notes || undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      setStars(0);
      setScale(7);
      setNotes("");
      setTags("");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                className="rounded p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8",
                    n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 py-4">
            <input
              type="range"
              min={1}
              max={10}
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <span className="w-8 text-2xl font-bold">{scale}</span>
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

        <Button onClick={handleSave} disabled={saving || (ratingType === "STARS" && stars === 0)} className="w-full">
          {t("save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
