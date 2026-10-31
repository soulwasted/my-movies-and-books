"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** Témata písma a palety převzatá z Invoicingu (stejné klíče v localStorage). */
export const THEME_STORAGE_KEY = "app-theme";

export type ThemeId = "default" | "space-mono" | "jetbrains-mono" | "courier-prime" | "ibm-plex-mono";

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "space-mono", label: "Space Mono" },
  { id: "jetbrains-mono", label: "JetBrains Mono" },
  { id: "courier-prime", label: "Courier Prime" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono" },
];

/** CSS proměnná fontu (next/font ji definuje na body), fallback pro Safari při cache. */
const THEME_FONT_VARS: Record<Exclude<ThemeId, "default">, string> = {
  "space-mono": "--font-space-mono",
  "jetbrains-mono": "--font-jetbrains-mono",
  "courier-prime": "--font-courier-prime",
  "ibm-plex-mono": "--font-ibm-plex-mono",
};

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "default";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  } catch {
    // Safari v soukromém režimu může localStorage zablokovat.
  }
  return "default";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const body = document.body;
    body.setAttribute("data-theme", theme);
    body.style.fontFamily =
      theme === "default" ? "" : `var(${THEME_FONT_VARS[theme]}), ui-monospace, monospace`;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Safari může localStorage zablokovat.
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
