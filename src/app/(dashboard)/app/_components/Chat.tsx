"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Square } from "lucide-react";
import { ChatMessage } from "@/app/(dashboard)/app/_components/ChatMessage";
import { ONBOARDING_MESSAGE, ONBOARDING_MESSAGE_WITH_PROFILE } from "@/infrastructure/ai/prompts";
import { useProfileStore } from "@/stores/profile";

export function Chat() {
  const profiles = useProfileStore((s) => s.profiles);

  const initialMessages = useMemo<UIMessage[]>(() => {
    const hasProfiles = Object.keys(profiles).length > 0;
    return [
      {
        id: "onboarding",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: hasProfiles ? ONBOARDING_MESSAGE_WITH_PROFILE : ONBOARDING_MESSAGE,
          },
        ],
      },
    ];
  }, [profiles]);

  // Stable transport — reads fresh profile data from the store at request time
  // to avoid stale closures from Zustand hydration timing
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => {
          const currentProfiles = useProfileStore.getState().profiles;
          const all = Object.values(currentProfiles);
          if (all.length === 0) return {};
          return {
            profileContext: {
              platforms: all.map((p) => ({
                username: p.username,
                platform: p.platform,
                rawData: p.rawData,
              })),
              interestTags: [...new Set(all.flatMap((p) => p.interestTags))],
              favoriteGenres: [...new Set(all.flatMap((p) => p.favoriteGenres))],
            },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    messages: initialMessages,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2 text-muted-foreground">
              <div className="h-6 w-6 animate-pulse rounded-full bg-primary/30" />
              <span className="text-sm italic">Pensando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/40 bg-surface p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe qué manga buscas..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          {isStreaming ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={stop}
              className="shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 bg-primary"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
