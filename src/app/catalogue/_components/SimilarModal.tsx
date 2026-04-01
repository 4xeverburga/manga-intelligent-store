"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";

interface SimilarManga {
  id: string;
  title: string;
  synopsis: string;
  genres: string[];
  score: number | null;
  imageUrl: string;
  similarity: number;
}

interface SimilarModalProps {
  mangaId: string | null;
  onClose: () => void;
}

export function SimilarModal({ mangaId, onClose }: SimilarModalProps) {
  const [results, setResults] = useState<SimilarManga[]>([]);
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);

  useEffect(() => {
    if (!mangaId) {
      setResults([]);
      return;
    }

    setLoading(true);
    fetch("/api/mangas/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mangaId }),
    })
      .then((r) => r.json())
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [mangaId]);

  return (
    <Dialog open={!!mangaId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mangas similares</DialogTitle>
          <DialogDescription>
            Encontrados usando búsqueda semántica con IA
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No se encontraron mangas similares
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.map((manga) => {
              const inCart = items.some((i) => i.mangaId === manga.id);
              const similarityPct = Math.round((manga.similarity ?? 0) * 100);
              return (
                <div
                  key={manga.id}
                  className="flex gap-3 rounded-lg bg-muted/30 p-3 ring-1 ring-foreground/5"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={manga.imageUrl}
                      alt={manga.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                    <h4 className="truncate text-sm font-medium">{manga.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400">
                        {similarityPct}% similar
                      </span>
                      {manga.score && (
                        <span className="text-xs text-muted-foreground">
                          ★ {manga.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {manga.genres.slice(0, 2).map((g) => (
                        <Badge
                          key={g}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {g}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-auto">
                      <Button
                        size="xs"
                        variant={inCart ? "secondary" : "default"}
                        disabled={inCart}
                        onClick={() => {
                          if (!inCart) {
                            addItem({
                              mangaId: manga.id,
                              title: manga.title,
                              imageUrl: manga.imageUrl,
                              price: 1.0,
                              quantity: 1,
                              source: "manual",
                              addedAt: new Date(),
                            });
                          }
                        }}
                      >
                        <ShoppingCart data-icon="inline-start" className="size-3" />
                        {inCart ? "En carrito" : "Agregar"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
