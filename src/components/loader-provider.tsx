"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** Vybraný styl načítání (ElapsedLoader), volba žije v localStorage jako téma písma. */
export const LOADER_STORAGE_KEY = "app-loader";

export type LoaderId =
  | "classic"
  | "comet"
  | "easing"
  | "countdown"
  | "old-print"
  | "mini-clap"
  | "slate"
  | "typewriter"
  | "terminal"
  | "decode";

/** Pořadí odpovídá návrhům: 02b, 02c, 07b, 07c, 08a, 08b, 09, 09a, 09b. */
export const LOADER_IDS: LoaderId[] = [
  "classic",
  "comet",
  "easing",
  "countdown",
  "old-print",
  "mini-clap",
  "slate",
  "typewriter",
  "terminal",
  "decode",
];

type LoaderContextValue = {
  loader: LoaderId;
  setLoader: (id: LoaderId) => void;
};

const LoaderContext = createContext<LoaderContextValue | null>(null);

function readStoredLoader(): LoaderId {
  if (typeof window === "undefined") return "classic";
  try {
    const stored = localStorage.getItem(LOADER_STORAGE_KEY);
    if (stored && LOADER_IDS.includes(stored as LoaderId)) return stored as LoaderId;
  } catch {
    // Safari v soukromém režimu může localStorage zablokovat.
  }
  return "classic";
}

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [loader, setLoader] = useState<LoaderId>(readStoredLoader);

  useEffect(() => {
    try {
      localStorage.setItem(LOADER_STORAGE_KEY, loader);
    } catch {
      // Safari může localStorage zablokovat.
    }
  }, [loader]);

  return <LoaderContext.Provider value={{ loader, setLoader }}>{children}</LoaderContext.Provider>;
}

export function useLoader() {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useLoader must be used within LoaderProvider");
  return ctx;
}
