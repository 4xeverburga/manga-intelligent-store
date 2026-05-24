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
    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {results.map((manga) => (
        <Card
          key={manga.id}
          className="flex w-40 shrink-0 flex-col gap-2 border-[#1e2c31] bg-[#02090a] p-3"
        >
          {manga.imageUrl && (
            <Image
              src={manga.imageUrl}
              alt={manga.title}
              width={136}
              height={190}
              className="h-[190px] w-full rounded object-cover"
            />
          )}
          <div className="flex flex-1 flex-col gap-1 overflow-hidden">
            <p className="truncate text-sm font-semibold">{manga.title}</p>
            <p className="text-xs text-[#a1a1aa]">⭐ {manga.score}</p>
            <div className="flex flex-wrap gap-1">
              {(manga.genres ?? []).slice(0, 2).map((g) => (
                <Badge key={g} variant="secondary" className="px-1 py-0 text-[10px]">
                  {g}
                </Badge>
              ))}
            </div>
            <Link href={`/catalogue/${manga.id}`} className="mt-auto">
              <Button size="xs" className="w-full">
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
