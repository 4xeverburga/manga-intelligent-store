"use client";

import type { UIMessage } from "@ai-sdk/react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MangaToolResult } from "@/app/(dashboard)/app/_components/MangaToolResult"
import { AddVolumeToCartResult, type AddVolumeResult } from "@/app/(dashboard)/app/_components/AddVolumeToCartResult"
import { CheckVolumeAvailabilityResult, type CheckVolumeAvailabilityOutput } from "@/app/(dashboard)/app/_components/CheckVolumeAvailabilityResult"

const isDev = process.env.NEXT_PUBLIC_APP_ENVIRONMENT === "DEV";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold",
          isUser
            ? "bg-white/20 text-white"
            : "bg-[#102620]"
        )}
      >
        {isUser ? (
          "U"
        ) : (
          <Image
            src="/brand/chat-assistant-icon.png"
            alt="Asistente de Hablemos Manga"
            width={28}
            height={28}
            className="h-full w-full object-cover"
            priority={false}
          />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "max-w-[85%] space-y-3",
          isUser && "text-right"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2 text-base leading-relaxed",
                  isUser
                    ? "inline-block bg-white text-black"
                    : "bg-[#061a1c]"
                )}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({ children }) => (
                      <p className="whitespace-pre-wrap [&:not(:last-child)]:mb-4">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-3 list-disc space-y-1 pl-5 text-left">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-3 list-decimal space-y-1 pl-5 text-left">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="pl-1">{children}</li>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {children}
                      </a>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }

          // Tool invocation parts — check if it's a tool type
          if ("toolCallId" in part && "state" in part) {
            const toolPart = part as {
              type: string;
              state: string;
              toolCallId: string;
              input?: Record<string, unknown>;
              output?: unknown;
            };

            if (toolPart.state === "output-available") {
              if (
                toolPart.type === "tool-search_manga" ||
                toolPart.type === "tool-get_recommendations"
              ) {
                return (
                  <MangaToolResult
                    key={toolPart.toolCallId}
                    results={toolPart.output as MangaResult[]}
                  />
                );
              }
              if (toolPart.type === "tool-add_volume_to_cart") {
                return (
                  <AddVolumeToCartResult
                    key={toolPart.toolCallId}
                    result={toolPart.output as AddVolumeResult}
                  />
                );
              }
              if (toolPart.type === "tool-check_volume_availability") {
                return (
                  <CheckVolumeAvailabilityResult
                    key={toolPart.toolCallId}
                    result={toolPart.output as CheckVolumeAvailabilityOutput}
                  />
                );
              }
            }

            if (
              toolPart.state === "input-streaming" ||
              toolPart.state === "input-available"
            ) {
              // Only show tool-in-progress indicators in dev mode
              if (!isDev) return null;
              return (
                <div
                  key={toolPart.toolCallId}
                  className="flex items-center gap-2 text-xs text-[#a1a1aa]"
                >
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-neon border-t-transparent" />
                  Buscando...
                </div>
              );
            }
          }

          return null;
        })}
      </div>
    </div>
  );
}

export interface MangaResult {
  id: string;
  title: string;
  synopsis: string;
  genres: string[];
  score: number;
  imageUrl: string;
  similarity: number;
}
