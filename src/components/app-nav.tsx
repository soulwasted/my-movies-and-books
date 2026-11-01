"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Library, Search, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const links = [
    {
      href: `/${locale}`,
      icon: Library,
      label: t("library"),
      match: new RegExp(`^/${locale}(/library)?$`),
    },
    { href: `/${locale}/discover`, icon: Search, label: t("discover"), match: /discover/ },
    { href: `/${locale}/me`, icon: CircleUser, label: t("me"), match: /\/me$/ },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 border-t border-border/60 bg-background/90 px-2 py-2 backdrop-blur-lg">
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
