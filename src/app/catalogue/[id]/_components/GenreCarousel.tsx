"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { genreToSpanish } from "@/lib/genres";

interface GenreManga {
  id: string;
  title: string;
  genres: string[];
  score: number | null;
  imageUrl: string;
}

interface GenreCarouselProps {
  genre: string;
  excludeId: string;
}

export function GenreCarousel({ genre, excludeId }: GenreCarouselProps) {
  const [results, setResults] = useState<GenreManga[] | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const spanishGenre = genreToSpanish(genre);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/mangas?genres=${encodeURIComponent(genre)}&limit=20`
      );
      const data = await res.json();
      const mangas = (data.data as GenreManga[]).filter(
        (m) => m.id !== excludeId
      );
      setResults(mangas);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!genre) return null;

  // Initial state: show the load button
  if (results === null) {
    return (
      <div className="mt-12">
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            `Ver más mangas de ${spanishGenre}`
          )}
        </Button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mt-12">
        <p className="text-sm text-[#71717a]">
          No se encontraron otros mangas de {spanishGenre}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">
          Mangas de {spanishGenre}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-none"
      >
        {results.map((manga) => (
          <Link
            key={manga.id}
            href={`/catalogue/${manga.id}`}
            className="group flex w-40 shrink-0 flex-col overflow-hidden rounded-xl border border-[#1e2c31] bg-[#02090a] transition-all hover:border-neon/20"
          >
            <div className="relative aspect-3/4 overflow-hidden">
              <Image
                src={manga.imageUrl}
                alt={manga.title}
                fill
                sizes="160px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {manga.score && manga.score > 0 && (
                <span className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-neon backdrop-blur-sm">
                  ★ {manga.score.toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-2.5">
              <h3 className="line-clamp-2 text-xs font-medium leading-tight text-white">
                {manga.title}
              </h3>
              <div className="mt-auto flex flex-wrap gap-1">
                {manga.genres.slice(0, 2).map((g) => (
                  <Badge
                    key={g}
                    variant="secondary"
                    className="px-1 py-0 text-[9px]"
                  >
                    {genreToSpanish(g)}
                  </Badge>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
