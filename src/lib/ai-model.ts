/** Jeden model pro všechna AI volání. Původní claude-sonnet-4-20250514 už API nezná (404). */
export const AI_MODEL = "claude-sonnet-5-5";

/**
 * Doporučování filmů a knih je chat, ne hluboké uvažování: nízký effort drží
 * odezvu v jednotkách sekund (výchozí "high" u Sonnet 5.5 je zbytečně pomalý).
 */
export const AI_EFFORT = "low" as const;

/** Kolik předchozích zpráv chatu se posílá modelu jako kontext. */
export const AI_HISTORY_LIMIT = 8;

export type AiChatTurn = { role: "user" | "assistant"; content: string };

/** Ponechá jen validní tahy a ořízne historii na posledních N zpráv. */
export function sanitizeHistory(raw: unknown): AiChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is AiChatTurn =>
        (t?.role === "user" || t?.role === "assistant") &&
        typeof t?.content === "string" &&
        t.content.trim().length > 0,
    )
    .slice(-AI_HISTORY_LIMIT)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }));
}

/** Messages API vyžaduje střídání rolí a začátek uživatelem. */
export function buildMessages(history: AiChatTurn[], message: string): AiChatTurn[] {
  const turns = [...history, { role: "user" as const, content: message }];
  const merged: AiChatTurn[] = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n\n${turn.content}`;
    } else {
      merged.push({ ...turn });
    }
  }
  while (merged[0]?.role === "assistant") merged.shift();
  return merged;
}
