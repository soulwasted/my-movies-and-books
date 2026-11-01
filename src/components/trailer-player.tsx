"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { youtubeId } from "@/lib/youtube";

// Náhled traileru; po kliknutí se na jeho místě spustí YouTube přehrávač (nocookie).
export function TrailerPlayer({ name, url }: { name: string; url: string }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(url);

  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-accent"
      >
        <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
      </a>
    );
  }

  return (
    <figure className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted ring-1 ring-white/5">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={name}
            className="group absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/10" />
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 flex items-center gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </figcaption>
    </figure>
  );
}
