"use client";

import type { ReactNode } from "react";

/** Pill s krátkým dotazem nebo odpovědí v AI chatu. */
export function Chip({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}
