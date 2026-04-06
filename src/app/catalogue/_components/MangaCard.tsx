"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeIn } from "@/components/motion";
import { useCartStore } from "@/stores/cart";

interface MangaCardProps {
  manga: {
    id: string;
    title: string;
    synopsis: string;
    genres: string[];
    imageUrl: string;
    score: number | null;
    popularity: number | null;
  };
  onFindSimilar: () => void;
}

function getScoreColor(score: number) {
  if (score >= 8) return "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30";
  if (score >= 6) return "bg-amber-500/20 text-amber-400 ring-amber-500/30";
  return "bg-red-500/20 text-red-400 ring-red-500/30";
}

export function MangaCard({ manga, onFindSimilar }: MangaCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const inCart = items.some((i) => i.mangaId === manga.id);
  const score = manga.score ?? 0;

  return (
    <motion.div
      variants={fadeIn}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/20"
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={manga.imageUrl}
          alt={manga.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Score badge */}
        {score > 0 && (
          <span
            className={`absolute top-2 right-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getScoreColor(score)}`}
          >
            ★ {score.toFixed(1)}
          </span>
        )}

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 z-10 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex w-full gap-2 p-3">
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              className="flex-1 text-xs"
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
              disabled={inCart}
            >
              <ShoppingCart data-icon="inline-start" className="size-3.5" />
              {inCart ? "En carrito" : "Agregar"}
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              className="bg-background/80 backdrop-blur-sm"
              onClick={onFindSimilar}
            >
              <Sparkles className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <Link href={`/catalogue/${manga.id}`} className="flex flex-1 flex-col gap-1.5 p-3 after:absolute after:inset-0 after:content-['']">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {manga.title}
        </h3>
        <div className="mt-auto flex flex-wrap gap-1">
          {manga.genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0">
              {genre}
            </Badge>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
