"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";
import { AiResponseView } from "@/components/ai-response-view";
import type { AiStructuredResponse } from "@/lib/ai";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; response: AiStructuredResponse };

export function AiChatClient({ locale }: { locale: string }) {
  const t = useTranslations("ai");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setHistory((h) => [...h, { role: "user", text }]);
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat", locale, message: text }),
      });
      const data = await res.json();
      setHistory((h) => [...h, { role: "ai", response: data.response }]);
    } finally {
      setLoading(false);
    }
  };

  const recommend = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "recommend", locale }),
      });
      const data = await res.json();
      setHistory((h) => [...h, { role: "ai", response: data.response }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-1 flex-col gap-4">
      <Button variant="outline" onClick={recommend} disabled={loading}>
        <Sparkles className="mr-2 h-4 w-4" />
        {t("recommend")}
      </Button>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {history.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-primary text-primary-foreground"
                : "mr-8 bg-muted text-muted-foreground"
            }`}
          >
            {msg.role === "user" ? (
              msg.text
            ) : (
              <AiResponseView data={msg.response} />
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">…</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder={t("placeholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="resize-none"
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
