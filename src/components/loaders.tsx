"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { LoaderId } from "@/components/loader-provider";

/** Milisekundy od připojení komponenty, tik po 100 ms. */
function useElapsedMs() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setMs(Date.now() - started), 100);
    return () => clearInterval(timer);
  }, []);
  return ms;
}

/** `steps` = živé kroky ze serveru; bez nich (náhled v nastavení) jedou ukázkové hlášky. */
type VariantProps = { label: string; ms: number; steps?: string[] };

function Seconds({ ms }: { ms: number }) {
  return <span className="tabular-nums text-muted-foreground/70">{Math.floor(ms / 1000)} s</span>;
}

function Classic({ label, ms }: VariantProps) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="size-4 shrink-0 animate-spin" />
      <span>{label}</span>
      <Seconds ms={ms} />
    </span>
  );
}

/** 02b — kometa v akcentové barvě. */
function Comet({ label, ms }: VariantProps) {
  return (
    <span className="ldr-line">
      <span className="ldr-bar ldr-comet" />
      <span className="ldr-row">
        <span>{label}</span>
        <Seconds ms={ms} />
      </span>
    </span>
  );
}

/** 02c — rychle naběhne a plíží se k 92 %. */
function Easing({ label, ms }: VariantProps) {
  return (
    <span className="ldr-line">
      <span className="ldr-bar">
        <span className="ldr-easing" style={{ width: `${(1 - Math.exp(-ms / 6000)) * 92}%` }} />
      </span>
      <span className="ldr-row">
        <span>{label}</span>
        <Seconds ms={ms} />
      </span>
    </span>
  );
}

/** 07b — filmový odpočet 3 · 2 · 1 se zábleskem. */
function Countdown({ label, ms }: VariantProps) {
  return (
    <span className="ldr-stack">
      <span className="ldr-leader">
        <span className="ldr-leader-ring" />
        <span className="ldr-leader-n">{3 - Math.floor((ms % 3000) / 1000)}</span>
        <span className="ldr-leader-flash" />
      </span>
      <span className="flex items-center gap-2">
        <span>{label}</span>
        <Seconds ms={ms} />
      </span>
    </span>
  );
}

/** 07c — tmavý odpočet se zrnem a škrábanci, uprostřed sekundy. */
function OldPrint({ label, ms }: VariantProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(64, 64);
    const timer = setInterval(() => {
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.random() < 0.5 ? 90 : 0;
      }
      ctx.putImageData(img, 0, 0);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="ldr-stack">
      <span className="ldr-leader ldr-leader-night">
        <span className="ldr-leader-ring" />
        <span className="ldr-leader-n">{Math.floor(ms / 1000)}</span>
        <canvas ref={canvas} width={64} height={64} className="ldr-grain" />
        <span className="ldr-scratch" />
      </span>
      <span>{label}</span>
    </span>
  );
}

/** 08a — klapka velká jako ikona. */
function MiniClap({ label, ms }: VariantProps) {
  return (
    <span className="flex items-center gap-2">
      <span className="ldr-clap-mini">
        <span className="ldr-clap">
          <span className="ldr-clap-top" />
          <span className="ldr-clap-base" />
        </span>
      </span>
      <span>{label}</span>
      <Seconds ms={ms} />
    </span>
  );
}

/** 08b — popsaná filmová klapka, TAKE stoupá s každým klapnutím. */
function Slate({ label, ms }: VariantProps) {
  const t = useTranslations("loader");
  return (
    <span className="ldr-stack">
      <span className="ldr-clap ldr-clap-wide">
        <span className="ldr-clap-top" />
        <span className="ldr-clap-base">
          <span className="ldr-slate">
            <span>{t("scene")}<b>12</b></span>
            <span>{t("shot")}<b>3</b></span>
            <span>TAKE<b>{Math.floor(ms / 1600) + 1}</b></span>
            <span className="ldr-slate-who">{t("director")}</span>
          </span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span>{label}</span>
        <Seconds ms={ms} />
      </span>
    </span>
  );
}

function useSteps(label: string, live?: string[]) {
  const t = useTranslations("loader");
  if (live) return live.length ? live : [label];
  return [label, ...(t.raw("steps") as string[])];
}

/** 09 — psací stroj: píše věty, maže je a píše další. */
function Typewriter({ label, ms, steps }: VariantProps) {
  const live = steps !== undefined;
  const lines = useSteps(label, live ? [label] : undefined);
  const [text, setText] = useState("");
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  });

  useEffect(() => {
    let line = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = linesRef.current[line % linesRef.current.length];
      if (!deleting) {
        chars++;
        if (chars > current.length) {
          // Živý krok zůstane napsaný, dokud server neohlásí další.
          if (live) return;
          deleting = true;
          timer = setTimeout(tick, 1400);
          return;
        }
      } else {
        chars -= 2;
        if (chars <= 0) {
          chars = 0;
          deleting = false;
          line++;
        }
      }
      setText(current.slice(0, chars));
      timer = setTimeout(tick, deleting ? 18 : 45 + Math.random() * 60);
    };
    tick();
    return () => clearTimeout(timer);
  }, [live]);

  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-foreground">
        {text}
        <span className="ldr-caret" />
      </span>
      <Seconds ms={ms} />
    </span>
  );
}

/** 09a — terminál: log kroků, každý se odškrtne. */
function Terminal({ label, steps: live }: VariantProps) {
  const steps = useSteps(label, live);
  const [count, setCount] = useState(1);
  const isLive = live !== undefined;
  useEffect(() => {
    if (isLive) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      setCount((c) => c + 1);
      timer = setTimeout(next, 900 + Math.random() * 900);
    };
    timer = setTimeout(next, 900);
    return () => clearTimeout(timer);
  }, [isLive]);

  // Živé kroky: hotové jsou všechny kromě posledního, žádný časovač.
  const total = live ? steps.length : count;
  const lines = (live ? steps : Array.from({ length: count }, (_, i) => steps[i % steps.length])).slice(-4);
  return (
    <span className="ldr-term">
      {lines.map((line, i) => (
        <span key={total - lines.length + i} className={i === lines.length - 1 ? "ldr-term-cur" : undefined}>
          {line}…{i < lines.length - 1 && <span className="ldr-term-ok"> ok</span>}
        </span>
      ))}
    </span>
  );
}

const GLYPHS = "ABCDEFGHJKLMNOPRSTUVZ0123456789#%&*";

/** 09b — náhodné znaky se zleva skládají do věty. */
function Decode({ label, ms, steps: live }: VariantProps) {
  const isLive = live !== undefined;
  const steps = useSteps(label, isLive ? [label] : undefined);
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });
  const [state, setState] = useState({ done: "", rest: "" });

  useEffect(() => {
    let phrase = 0;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const text = stepsRef.current[phrase % stepsRef.current.length];
      const done = Math.floor(frame / 2);
      const rest = [...text.slice(done)]
        .map((c) => (c === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
      setState({ done: text.slice(0, done), rest });
      frame++;
      if (done >= text.length) {
        if (isLive) return;
        phrase++;
        frame = 0;
        timer = setTimeout(tick, 1600);
      } else {
        timer = setTimeout(tick, 40);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [isLive]);

  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-foreground">
        {state.done}
        <span className="text-muted-foreground/50">{state.rest}</span>
      </span>
      <Seconds ms={ms} />
    </span>
  );
}

const VARIANTS: Record<LoaderId, (props: VariantProps) => React.ReactNode> = {
  classic: Classic,
  comet: Comet,
  easing: Easing,
  countdown: Countdown,
  "old-print": OldPrint,
  "mini-clap": MiniClap,
  slate: Slate,
  typewriter: Typewriter,
  terminal: Terminal,
  decode: Decode,
};

/** Vykreslí zvolený styl načítání s textem a počítadlem. */
export function LoaderVariant({ id, label, steps }: { id: LoaderId; label: string; steps?: string[] }) {
  const ms = useElapsedMs();
  const Variant = VARIANTS[id];
  // Se živými kroky ukazují jednořádkové styly aktuální krok; nový krok = nová animace psaní.
  const current = steps?.at(-1) ?? label;
  return <Variant key={steps ? current : undefined} label={current} ms={ms} steps={steps} />;
}
