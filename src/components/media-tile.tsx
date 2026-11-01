import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Úroveň 1 „dlaždice“ pro film i knihu: obal, název a jeden řádek údajů.
 * Knihovna, Objevovat i filmografie člověka používají jen tuhle, ať vypadají stejně.
 * Bez hooků, takže jde do serverových i klientských stránek.
 */
export function MediaTile({
  href,
  title,
  image,
  meta,
  badge,
  overlay,
  footer,
  actions,
  unoptimized = false,
}: {
  href: string;
  title: string;
  image: string | null;
  /** Druhý řádek, části spojené tečkou (rok · role / autor · rok). */
  meta?: (string | null | undefined)[];
  /** Roh obalu vpravo nahoře (hodnocení, stav). */
  badge?: ReactNode;
  /** Spodek obalu (štítek stavu v historii). */
  overlay?: ReactNode;
  /** Pod údaji uvnitř odkazu (štítky). */
  footer?: ReactNode;
  /** Pod dlaždicí mimo odkaz (rozhodovací ikony). */
  actions?: ReactNode;
  unoptimized?: boolean;
}) {
  const metaLine = meta?.filter(Boolean).join(" · ");
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card transition-colors hover:border-primary/30">
      <Link href={href} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 640px) 200px, 50vw"
              className="object-cover transition-transform group-hover:scale-[1.03]"
              unoptimized={unoptimized}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
              {title}
            </div>
          )}
          {badge && <div className="absolute right-1.5 top-1.5">{badge}</div>}
          {overlay && <div className="absolute inset-x-2 bottom-2">{overlay}</div>}
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
          {metaLine && <p className="line-clamp-1 text-xs text-muted-foreground tabular-nums">{metaLine}</p>}
          {footer}
        </div>
      </Link>
      {actions}
    </div>
  );
}

/** Mřížka dlaždic, všude stejně hustá. */
export const TILE_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3";

/** Údaje jedním řádkem se stejným oddělovačem na všech úrovních: „1993 · 97 min“. */
export function metaLine(parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join(" · ");
}
