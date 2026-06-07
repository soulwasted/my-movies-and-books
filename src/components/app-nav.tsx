"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Film, Compass, Library, BarChart3, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const links = [
    { href: `/${locale}`, icon: Film, label: t("home"), match: new RegExp(`^/${locale}$`) },
    {
      href: `/${locale}/discover`,
      icon: Compass,
      label: t("discover"),
      match: /discover/,
    },
    {
      href: `/${locale}/library`,
      icon: Library,
      label: t("library"),
      match: /library/,
    },
    { href: `/${locale}/ai`, icon: Sparkles, label: t("ai"), match: /\/ai/ },
    { href: `/${locale}/stats`, icon: BarChart3, label: t("stats"), match: /stats/ },
    { href: `/${locale}/settings`, icon: Settings, label: t("settings"), match: /settings/ },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-border/60 bg-background/90 px-2 py-2 backdrop-blur-lg">
      <div className="flex items-center justify-around">
        {links.map(({ href, icon: Icon, label, match }) => {
          const active = match.test(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
