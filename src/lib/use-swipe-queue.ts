"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Kolik karet dopředu se načítá (data i obrázek), aby další karta byla hned. */
const PREFETCH_AHEAD = 3;
const UNDO_TIMEOUT_MS = 12_000;

type UndoState<T> = { index: number; item: T };

/** Stáhne obrázek do cache prohlížeče, ještě než se karta zobrazí. */
function preloadImage(src: string | null | undefined) {
  if (!src || typeof window === "undefined") return;
  const img = new window.Image();
  img.decoding = "async";
  img.src = src;
}

/**
 * Sdílená logika swipe fronty pro filmy i knihy.
 *
 * - fronta se načte jednou při mountu (dřív se načítala znovu při každé změně
 *   identity `t()`, takže první karta problikla a nahradila ji jiná),
 * - karty se načítají dopředu a deduplikují (žádný refetch už zobrazené karty),
 * - rozhodnutí se ukládá optimisticky: karta se posune hned, zápis běží na pozadí.
 */
export function useSwipeQueue<T extends { id: K }, K extends string | number, C>(options: {
  queueUrl: string;
  readQueue: (data: unknown) => T[];
  fetchCard: (id: K) => Promise<C | null>;
  cardImage: (card: C) => string | null;
  recordSeen: (id: K) => Promise<unknown>;
  undoSave: (id: K) => Promise<unknown>;
  errorText: string;
}) {
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [cards, setCards] = useState<Map<K, C>>(new Map());
  const [undo, setUndo] = useState<UndoState<T> | null>(null);

  const inflight = useRef(new Map<K, Promise<void>>());
  const seen = useRef(new Set<K>());
  const pendingSave = useRef<Promise<unknown>>(Promise.resolve());
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRequest = useRef(0);

  const fetchQueue = useCallback(async () => {
    const requestId = ++queueRequest.current;
    try {
      const res = await fetch(optsRef.current.queueUrl, { credentials: "include" });
      const data = await res.json();
      // Starší odpověď (StrictMode, dvojklik na "znovu") nesmí přepsat novější frontu.
      if (requestId !== queueRequest.current) return;
      if (!res.ok) {
        setError((data as { error?: string }).error ?? optsRef.current.errorText);
        setItems([]);
        return;
      }
      setError(null);
      setItems(optsRef.current.readQueue(data));
      setIndex(0);
      setUndo(null);
    } catch {
      if (requestId !== queueRequest.current) return;
      setError(optsRef.current.errorText);
      setItems([]);
    } finally {
      if (requestId === queueRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchQueue();
  }, [fetchQueue]);

  const ensureCard = useCallback((id: K, force = false) => {
    if (!force && inflight.current.has(id)) return inflight.current.get(id)!;
    const promise = optsRef.current
      .fetchCard(id)
      .then((card) => {
        if (!card) return;
        preloadImage(optsRef.current.cardImage(card));
        setCards((prev) => new Map(prev).set(id, card));
      })
      .catch(() => {
        // Při chybě dovolit další pokus.
        inflight.current.delete(id);
      });
    inflight.current.set(id, promise);
    return promise;
  }, []);

  // Aktuální karta + několik dalších dopředu, paralelně.
  useEffect(() => {
    for (const item of items.slice(index, index + 1 + PREFETCH_AHEAD)) {
      void ensureCard(item.id);
    }
  }, [items, index, ensureCard]);

  const current = items[index];
  const currentCard = current ? (cards.get(current.id) ?? null) : null;

  useEffect(() => {
    if (!current || !currentCard || seen.current.has(current.id)) return;
    seen.current.add(current.id);
    void optsRef.current.recordSeen(current.id).catch(() => {});
  }, [current, currentCard]);

  const refreshCard = useCallback(
    (id: K) => {
      setCards((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return ensureCard(id, true);
    },
    [ensureCard],
  );

  /** Posune frontu hned a zápis pustí na pozadí (řetězený kvůli undo). */
  const commit = useCallback(
    (item: T, atIndex: number, save: () => Promise<unknown>) => {
      pendingSave.current = pendingSave.current.then(save).catch(() => {});
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setUndo({ index: atIndex, item });
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_TIMEOUT_MS);
      setIndex(atIndex + 1);
    },
    [],
  );

  const handleUndo = useCallback(async () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
    setIndex(undo.index);
    const id = undo.item.id;
    pendingSave.current = pendingSave.current
      .then(() => optsRef.current.undoSave(id))
      .catch(() => {});
    await pendingSave.current;
  }, [undo]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  return {
    items,
    loading,
    error,
    index,
    current,
    currentCard,
    undo,
    reload,
    refreshCard,
    commit,
    handleUndo,
  };
}
