"use client";

import { useTranslations } from "next-intl";
import { Bookmark, Check, SkipForward, ThumbsDown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Jediné místo, kde je dané pořadí a význam rozhodnutí o filmu nebo knize.
 * Pohledy (fronta, detail, AI karta, knihovna) mění jen vzhled přes `variant`.
 */
export type MovieDecision = "WANT" | "WATCHED" | "NOT_INTERESTED" | "SKIPPED";
export type BookDecision = "WANT" | "READ" | "NOT_INTERESTED" | "SKIPPED";

type Key = "want" | "done" | "no" | "later";
const ORDER: Array<{ key: Key; icon: LucideIcon }> = [
  // Srdce patří oblíbeným tvůrcům, „Chci vidět“ má záložku (jedna ikona, jeden význam).
  { key: "want", icon: Bookmark },
  { key: "done", icon: Check },
  { key: "no", icon: ThumbsDown },
  { key: "later", icon: SkipForward },
];

function statusFor(key: Key, media: "movie" | "book") {
  if (key === "want") return "WANT";
  if (key === "done") return media === "movie" ? "WATCHED" : "READ";
  if (key === "no") return "NOT_INTERESTED";
  return "SKIPPED";
}

type Props<D extends string> = {
  /** Aktuální stav (zvýrazní tlačítko). */
  status?: string | null;
  onDecide: (decision: D) => void;
  disabled?: boolean;
  /** bar = swipe fronta, inline = detail, compact = karta v seznamu, icons = mřížka knihovny. */
  variant: "bar" | "inline" | "compact" | "icons";
  className?: string;
};

export function MovieDecisionButtons(props: Props<MovieDecision>) {
  return <DecisionButtons media="movie" {...(props as Props<string>)} />;
}

export function BookDecisionButtons(props: Props<BookDecision>) {
  return <DecisionButtons media="book" {...(props as Props<string>)} />;
}

function DecisionButtons({
  media,
  status,
  onDecide,
  disabled,
  variant,
  className,
}: Props<string> & { media: "movie" | "book" }) {
  const t = useTranslations(`decision.${media}`);

  return (
    <div
      className={cn(
        variant === "inline" ? "flex flex-wrap gap-2" : "grid grid-cols-4",
        variant === "bar" ? "gap-2" : variant === "icons" ? "gap-1" : "gap-1.5",
        className,
      )}
    >
      {ORDER.map(({ key, icon: Icon }) => {
        const value = statusFor(key, media);
        const active = status === value;
        const label = t(key);

        if (variant === "icons") {
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onDecide(value)}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
                active && "text-primary",
              )}
            >
              <Icon className={cn("h-4 w-4", active && key !== "later" && "fill-current")} />
            </button>
          );
        }

        return (
          <Button
            key={key}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onDecide(value)}
            aria-pressed={active}
            className={cn(
              variant === "bar" && "h-auto flex-col gap-1 py-3",
              variant === "compact" && "h-auto flex-col gap-0.5 px-1 py-1.5 text-[10px] leading-tight",
            )}
          >
            <Icon className={variant === "bar" ? "h-5 w-5" : variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            <span className={variant === "bar" ? "text-xs font-medium" : undefined}>{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
