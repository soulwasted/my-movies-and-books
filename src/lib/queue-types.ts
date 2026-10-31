import type { TmdbMovieListItem } from "@/lib/tmdb";

/** Proč je film ve frontě: zobrazuje se na kartě jako „Proč tenhle film?“. */
export type QueueReason =
  | { type: "because"; title: string }
  | { type: "genres"; names: string[] }
  | { type: "explore" }
  | { type: "ai"; text: string };

export type QueueMovie = TmdbMovieListItem & { reason?: QueueReason };
