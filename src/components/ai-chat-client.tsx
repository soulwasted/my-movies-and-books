"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Send } from "lucide-react";
import { AiResponseView } from "@/components/ai-response-view";
import type { AiStructuredResponse } from "@/lib/ai";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; response: AiStructuredResponse; media: "movie" | "book" }
  | { role: "error"; text: string };

/** Textová podoba odpovědi AI, aby model v dalším tahu věděl, co už doporučil. */
function responseAsText(response: AiStructuredResponse): string {
  const recs = response.recommendations
    .map((r) => `- ${r.title} (${r.year})${r.author ? `, ${r.author}` : ""}`)
    .join("\n");
  return [response.summary, recs, response.followUp].filter(Boolean).join("\n\n");
}

export function AiChatClient({ locale }: { locale: string }) {
  const t = useTranslations("ai");
  const tCommon = useTranslations("common");
  const [media, setMedia] = useState<"movie" | "book">("movie");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, media, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.response) {
        setHistory((h) => [...h, { role: "error", text: data.error ?? tCommon("error") }]);
        return;
      }
      setHistory((h) => [
        ...h,
        { role: "ai", response: data.response, media: data.media ?? media },
      ]);
    } catch {
      setHistory((h) => [...h, { role: "error", text: tCommon("error") }]);
    } finally {
      setLoading(false);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    // Kontext konverzace pro aktuální typ média (filmy a knihy se nemíchají).
    const context = history.flatMap((msg) => {
      if (msg.role === "user") return [{ role: "user", content: msg.text }];
      if (msg.role === "ai" && msg.media === media) {
        return [{ role: "assistant", content: responseAsText(msg.response) }];
      }
      return [];
    });
    setHistory((h) => [...h, { role: "user", text }]);
    setMessage("");
    await ask({ type: "chat", message: text, history: context });
  };

  const recommend = () => ask({ type: "recommend" });

  return (
    <div className="mt-4 flex flex-1 flex-col gap-4">
      <Tabs
        value={media}
        onValueChange={(v) => setMedia(v as "movie" | "book")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movie">{t("movies")}</TabsTrigger>
          <TabsTrigger value="book">{t("books")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Button variant="outline" onClick={recommend} disabled={loading}>
        <Sparkles className="mr-2 h-4 w-4" />
        {media === "book" ? t("recommendBooks") : t("recommend")}
      </Button>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {history.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-primary text-primary-foreground"
                : msg.role === "error"
                  ? "mr-8 border border-destructive/40 bg-destructive/10 text-destructive"
                  : "mr-8 bg-muted text-muted-foreground"
            }`}
          >
            {msg.role !== "ai" ? (
              msg.text
            ) : (
              <AiResponseView
                data={msg.response}
                locale={locale}
                media={msg.media}
              />
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">…</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder={media === "book" ? t("placeholderBook") : t("placeholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(message);
            }
          }}
        />
        <Button size="icon" onClick={() => send(message)} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
