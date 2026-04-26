"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { SendHorizontal, RotateCcw } from "lucide-react";
import { ChatMessage } from "@/app/(dashboard)/app/_components/ChatMessage";
import { ONBOARDING_MESSAGE, ONBOARDING_MESSAGE_WITH_PROFILE } from "@/infrastructure/ai/prompts";
import { useProfileStore } from "@/stores/profile";

const STORAGE_KEY = "hablemos-manga-chat";
const MAX_USER_TURNS = Number(process.env.NEXT_PUBLIC_CHAT_MAX_TURNS) || 20;

/** Wrapper that waits for Zustand hydration before mounting the chat */
export function Chat() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useProfileStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useProfileStore.persist.onFinishHydration(() =>
        setHydrated(true)
      );
      return unsub;
    }
  }, []);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[#71717a] italic">Cargando chat...</span>
      </div>
    );
  }

  return <ChatInner />;
}

function ChatInner() {
  const makeOnboardingMessage = useCallback((): UIMessage => {
    const hasProfiles = Object.keys(useProfileStore.getState().profiles).length > 0;
    return {
      id: "onboarding",
      role: "assistant" as const,
      parts: [
        {
          type: "text" as const,
          text: hasProfiles ? ONBOARDING_MESSAGE_WITH_PROFILE : ONBOARDING_MESSAGE,
        },
      ],
    };
  }, []);

  const onboardingMessage = useMemo<UIMessage>(
    () => makeOnboardingMessage(),
    [makeOnboardingMessage]
  );

  // Load persisted messages from localStorage (or fall back to onboarding)
  const initialMessages = useMemo<UIMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UIMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* corrupt data — start fresh */ }
    return [onboardingMessage];
  }, [onboardingMessage]);

  // Stable transport — reads fresh profile data from the store at request time
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

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    messages: initialMessages,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming" || status === "submitted";
  const userTurns = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );
  const limitReached = userTurns >= MAX_USER_TURNS;

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    // Only persist after we have more than the onboarding message, or always persist
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* storage full — ignore */ }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming || limitReached) return;
    sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  };

  const handleRestart = useCallback(() => {
    const fresh = [makeOnboardingMessage()];
    setMessages(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, [makeOnboardingMessage, setMessages]);

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
            <div className="flex gap-2 text-[#a1a1aa]">
              <div className="h-6 w-6 animate-pulse rounded-full bg-neon/30" />
              <span className="text-base italic">Pensando...</span>
            </div>
          )}

          {/* Stream error */}
          {error && !isStreaming && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#102620] text-xs font-bold text-neon">
                AI
              </div>
              <div className="rounded-lg border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-base text-[#a1a1aa]">
                {error.message}
              </div>
            </div>
          )}

          {/* Turn limit reached */}
          {limitReached && !isStreaming && (
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-sm text-[#a1a1aa]">
                Has alcanzado el límite de {MAX_USER_TURNS} mensajes. Inicia una nueva conversación para continuar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#1e2c31] bg-[#02090a] p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          {limitReached ? (
            <div className="flex flex-1 items-center justify-center py-1">
              <Button variant="outline" size="sm" onClick={handleRestart}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Nueva conversación
              </Button>
            </div>
          ) : (
            <>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe qué manga buscas..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-[#1e2c31] bg-[#061a1c] px-3 py-2 text-base text-white placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-neon/50"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="shrink-0 bg-neon text-black hover:bg-neon/90"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        {!limitReached && userTurns > 0 && (
          <div className="mx-auto mt-1.5 flex max-w-2xl text-[10px] text-[#71717a]">
            <span>{userTurns}/{MAX_USER_TURNS} mensajes</span>
          </div>
        )}
      </div>
    </div>
  );
}
