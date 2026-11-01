import type { AiStructuredResponse } from "@/lib/ai";

/** Skutečný krok na serveru, jak ho /api/ai hlásí během zpracování. */
export type AiStep =
  | { id: "profile" }
  | { id: "ask"; rated: number; excluded: number }
  | { id: "verify"; count: number; source: "tmdb" | "books" };

export type AiResult = { response: AiStructuredResponse; media: "movie" | "book" };

/** Jeden řádek NDJSON streamu z /api/ai. */
export type AiStreamEvent =
  | { type: "step"; step: AiStep }
  | ({ type: "result" } & AiResult)
  | { type: "error"; error: string };

/** Zavolá /api/ai a průběžně hlásí kroky; vrátí výsledek, nebo vyhodí Error s hláškou pro uživatele. */
export async function fetchAi(
  body: Record<string, unknown>,
  onStep: (step: AiStep) => void,
): Promise<AiResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Chyby před startem streamu (přihlášení, validace) chodí jako obyčejný JSON.
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "");
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as AiStreamEvent;
      if (event.type === "step") onStep(event.step);
      else if (event.type === "error") throw new Error(event.error);
      else return { response: event.response, media: event.media };
    }
    if (done) throw new Error("");
  }
}
