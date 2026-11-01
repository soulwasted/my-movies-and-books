"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Logo = { url: string; width: number; height: number };

// Obsah detailu nad fixním backdropem. Stažením dolů (prst, nebo kolečko nahoru, když je stránka nahoře)
// gumově odjede, ztlumí se a nad obrázkem se objeví velké logo filmu. Obsah nikdy nezmizí celý: zastaví se
// pod obrázkem, nebo nejpozději tak, aby jeho vršek koukal nad spodní navigací. Prst po puštění obsah vrátí.
// Kolečko přes práh obrázek odhalí natrvalo, zpátky ho vrátí kolečko dolů, klik nebo Esc; pod prahem se
// po chvilce nečinnosti vrátí samo.
export function BackdropReveal({
  label,
  logo,
  title,
  children,
}: {
  label: string;
  logo: Logo | null;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const restTop = useRef(0);

  // Jak daleko smí obsah sjet: vršek ke spodku obrázku (16:9), ale aspoň 200 px nad spodkem okna.
  const maxShift = () =>
    Math.max(0, Math.min(window.innerHeight - 200, (window.innerWidth * 9) / 16 + 16) - restTop.current);

  const apply = (d: number, animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    const p = Math.min(1, d / (maxShift() || 1));
    const transition = animate ? "transform 450ms cubic-bezier(.2,.8,.2,1), opacity 450ms ease" : "none";
    el.style.transition = transition;
    el.style.transform = d ? `translateY(${d}px)` : "";
    el.style.opacity = d ? String(1 - 0.45 * p) : "";
    const lg = logoRef.current;
    if (lg) {
      lg.style.transition = transition;
      lg.style.opacity = String(p);
      lg.style.transform = `scale(${0.94 + 0.06 * p})`;
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!el.style.transform) restTop.current = el.getBoundingClientRect().top;
    };
    // Gumový odpor: čím dál, tím pomaleji, nikdy ne přes maxShift.
    const rubber = (raw: number) => {
      const m = maxShift();
      return m * (1 - Math.exp(-raw / m));
    };

    // Dotyk
    let startY = 0;
    let active = false;
    let pulling = false;
    const onStart = (e: TouchEvent) => {
      active = window.scrollY <= 0;
      pulling = false;
      startY = e.touches[0].clientY;
      measure();
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const raw = e.touches[0].clientY - startY;
      if (raw <= 0) {
        if (pulling) apply(0, false);
        pulling = false;
        return;
      }
      pulling = true;
      if (e.cancelable) e.preventDefault();
      apply(rubber(raw), false);
    };
    const onEnd = () => {
      if (pulling) apply(0, true);
      active = pulling = false;
    };

    // Kolečko
    let wheelRaw = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (revealedRef.current) {
        if (e.deltaY > 0) setRevealed(false);
        return;
      }
      if (window.scrollY > 0 || (e.deltaY >= 0 && wheelRaw === 0)) return;
      e.preventDefault();
      if (wheelRaw === 0) measure();
      wheelRaw = Math.max(0, wheelRaw - e.deltaY);
      clearTimeout(idle);
      if (rubber(wheelRaw) > maxShift() * 0.5) {
        wheelRaw = 0;
        revealedRef.current = true; // hned, ať zbylé eventy setrvačnosti nezačnou nový tah
        setRevealed(true);
        return;
      }
      apply(rubber(wheelRaw), false);
      idle = setTimeout(() => {
        wheelRaw = 0;
        apply(0, true);
      }, 180);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(idle);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("wheel", onWheel);
    };
    // apply/maxShift čtou jen refy, efekt stačí jednou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    revealedRef.current = revealed;
    apply(revealed ? maxShift() : 0, true);
    if (!revealed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRevealed(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <>
      {/* Velké logo nad obrázkem, vidět jen při staženém obsahu. */}
      <div
        ref={logoRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 flex h-[min(56.25vw,calc(100svh-200px))] items-end justify-center px-[8vw] pb-[4vw] opacity-0"
      >
        {logo ? (
          <Image
            src={logo.url}
            alt=""
            width={logo.width}
            height={logo.height}
            className="h-auto max-h-[45%] w-auto max-w-[min(70%,40rem)] drop-shadow-[0_4px_24px_rgb(0_0_0/0.6)]"
          />
        ) : (
          <p className="text-center text-4xl font-bold tracking-tight text-balance drop-shadow-[0_4px_24px_rgb(0_0_0/0.8)] sm:text-6xl">
            {title}
          </p>
        )}
      </div>
      <div ref={ref} className={`relative flex flex-1 flex-col ${revealed ? "pointer-events-none" : ""}`}>
        {children}
      </div>
      {revealed && (
        <button
          type="button"
          aria-label={label}
          onClick={() => setRevealed(false)}
          className="fixed inset-0 z-40 cursor-zoom-out"
        />
      )}
    </>
  );
}
