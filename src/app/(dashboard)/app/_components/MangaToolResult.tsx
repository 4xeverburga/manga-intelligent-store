"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { MangaResult } from "@/app/(dashboard)/app/_components/ChatMessage";

export function MangaToolResult({ results }: { results: MangaResult[] }) {
  if (!results?.length) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {results.map((manga) => (
        <Card
          key={manga.id}
          className="flex gap-3 border-[#1e2c31] bg-[#02090a] p-3"
        >
          {manga.imageUrl && (
            <Image
              src={manga.imageUrl}
              alt={manga.title}
              width={60}
              height={85}
              className="h-[85px] w-[60px] shrink-0 rounded object-cover"
            />
          )}
          <div className="flex flex-1 flex-col gap-1 overflow-hidden">
            <p className="truncate text-sm font-semibold">{manga.title}</p>
            <p className="text-xs text-[#a1a1aa]">
              ⭐ {manga.score}
            </p>
            <div className="flex flex-wrap gap-1">
              {(manga.genres ?? []).slice(0, 3).map((g) => (
                <Badge
                  key={g}
                  variant="secondary"
                  className="text-[10px] px-1 py-0"
                >
                  {g}
                </Badge>
              ))}
            </div>
            <Link href={`/catalogue/${manga.id}`}>
              <Button
                size="xs"
                className="mt-auto self-start"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Ver volúmenes
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
