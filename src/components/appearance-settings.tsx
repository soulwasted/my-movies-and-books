"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { THEMES, useTheme } from "@/components/theme-provider";
import { useColorScheme, type ColorScheme } from "@/components/color-scheme-provider";
import { LOADER_IDS, useLoader } from "@/components/loader-provider";
import { LoaderVariant } from "@/components/loaders";
import { choiceToggleStyles } from "@/lib/choice-toggle-styles";

const SCHEMES: ColorScheme[] = ["dark", "light"];
const noopSubscribe = () => () => {};

export function AppearanceSettings() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { loader, setLoader } = useLoader();
  const tLoader = useTranslations("loader");
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
      <div>
        <p className="text-sm text-muted-foreground">{t("loaderStyle")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LOADER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLoader(id)}
              className={choiceToggleStyles(hydrated && loader === id, "rounded-md px-4 py-2")}
            >
              {tLoader(`names.${id}`)}
            </button>
          ))}
        </div>
        {hydrated && (
          <div className="mt-3 flex min-h-28 items-center justify-center rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <LoaderVariant key={loader} id={loader} label={t("loaderPreview")} />
          </div>
        )}
      </div>
    </div>
  );
}
