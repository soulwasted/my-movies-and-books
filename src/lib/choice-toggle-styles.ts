import { cn } from "@/lib/utils";

/** Přepínač volby ve stylu Invoicingu (vybraná = primary, ostatní = muted). */
export function choiceToggleStyles(selected: boolean, className?: string) {
  return cn(
    "text-sm font-medium transition-colors",
    selected
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    className,
  );
}
