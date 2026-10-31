"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { THEMES, useTheme } from "@/components/theme-provider";
import { useColorScheme, type ColorScheme } from "@/components/color-scheme-provider";
import { choiceToggleStyles } from "@/lib/choice-toggle-styles";

const SCHEMES: ColorScheme[] = ["dark", "light"];
const noopSubscribe = () => () => {};

export function AppearanceSettings() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  // Volba žije v localStorage: na serveru ji neznáme, zvýraznění až po hydrataci.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{t("colorScheme")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SCHEMES.map((scheme) => (
            <button
              key={scheme}
              type="button"
              onClick={() => setColorScheme(scheme)}
              className={choiceToggleStyles(hydrated && colorScheme === scheme, "rounded-md px-4 py-2")}
            >
              {t(scheme === "dark" ? "schemeDark" : "schemeLight")}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{t("fontTheme")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={choiceToggleStyles(hydrated && theme === option.id, "rounded-md px-4 py-2")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
