"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SimilarManga {
  id: string;
  title: string;
  genres: string[];
  score: number | null;
  imageUrl: string;
  similarity: number;
}

export function SimilarCarousel({ mangaId }: { mangaId: string }) {
  const [results, setResults] = useState<SimilarManga[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/mangas/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mangaId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [mangaId]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Mangas similares</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Mangas similares</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => scroll("left")}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => scroll("right")}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-none"
      >
        {results.map((manga) => {
          const similarityPct = Math.round((manga.similarity ?? 0) * 100);
          return (
            <Link
              key={manga.id}
              href={`/catalogue/${manga.id}`}
              className="group flex w-[160px] shrink-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-all hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/20"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={manga.imageUrl}
                  alt={manga.title}
                  fill
                  sizes="160px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 backdrop-blur-sm">
                  {similarityPct}% similar
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <h3 className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                  {manga.title}
                </h3>
                <div className="mt-auto flex flex-wrap gap-1">
                  {manga.genres.slice(0, 2).map((g) => (
                    <Badge
                      key={g}
                      variant="secondary"
                      className="text-[9px] px-1 py-0"
                    >
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
