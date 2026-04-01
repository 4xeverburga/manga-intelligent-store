"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import type { MangaResult } from "./ChatMessage";

export function MangaToolResult({ results }: { results: MangaResult[] }) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);

  if (!results?.length) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {results.map((manga) => {
        const inCart = items.some((i) => i.mangaId === manga.id);
        return (
          <Card
            key={manga.id}
            className="flex gap-3 border-border/40 bg-card/80 p-3"
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
              <p className="text-xs text-muted-foreground">
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
              <Button
                size="xs"
                variant={inCart ? "secondary" : "default"}
                className="mt-auto self-start"
                disabled={inCart}
                onClick={() =>
                  addItem({
                    mangaId: manga.id,
                    title: manga.title,
                    imageUrl: manga.imageUrl,
                    price: 1.0,
                    quantity: 1,
                    source: "ai-suggested",
                    addedAt: new Date(),
                  })
                }
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                {inCart ? "En carrito" : "Agregar"}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
