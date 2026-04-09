"use client";

import type { UIMessage } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { MangaToolResult } from "@/app/(dashboard)/app/_components/MangaToolResult"
import { AddVolumeToCartResult, type AddVolumeResult } from "@/app/(dashboard)/app/_components/AddVolumeToCartResult"
import { CheckVolumeAvailabilityResult, type CheckVolumeAvailabilityOutput } from "@/app/(dashboard)/app/_components/CheckVolumeAvailabilityResult"

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? "U" : "AI"}
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
                    ? "inline-block bg-primary text-primary-foreground"
                    : "bg-muted/50 prose prose-invert prose-base max-w-none"
                )}
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(part.text),
                }}
              />
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
              return (
                <div
                  key={toolPart.toolCallId}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}
