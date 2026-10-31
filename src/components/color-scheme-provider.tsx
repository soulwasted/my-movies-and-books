"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const COLOR_SCHEME_STORAGE_KEY = "app-color-scheme";

export type ColorScheme = "light" | "dark";

type ColorSchemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

/** Media Diary byl vždy tmavý, proto je tmavý režim výchozí (Invoicing má světlý). */
function readStoredScheme(): ColorScheme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(COLOR_SCHEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(readStoredScheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorScheme === "dark");
    try {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme);
    } catch {
      // Safari může localStorage zablokovat.
    }
  }, [colorScheme]);

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) throw new Error("useColorScheme must be used within ColorSchemeProvider");
  return ctx;
}
