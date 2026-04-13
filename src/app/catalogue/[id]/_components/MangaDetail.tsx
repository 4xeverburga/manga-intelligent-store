"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface MangaDetailProps {
  manga: {
    id: string;
    title: string;
    synopsis: string;
    genres: string[];
    imageUrl: string;
    score: number | null;
    popularity: number | null;
  };
}

function getScoreColor(score: number) {
  if (score >= 8) return "bg-neon/20 text-neon ring-neon/30";
  if (score >= 6) return "bg-amber-500/20 text-amber-400 ring-amber-500/30";
  return "bg-red-500/20 text-red-400 ring-red-500/30";
}

export function MangaDetail({ manga }: MangaDetailProps) {
  const score = manga.score ?? 0;

  return (
    <div>
      <Link
        href="/catalogue"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#a1a1aa] transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Volver al catálogo
      </Link>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Cover image */}
        <div className="shrink-0">
          <div className="relative aspect-3/4 w-full max-w-70 overflow-hidden rounded-xl border border-[#1e2c31] md:w-70">
            <Image
              src={manga.imageUrl}
              alt={manga.title}
              fill
              sizes="280px"
              className="object-cover"
              priority
            />
            {score > 0 && (
              <span
                className={`absolute top-3 right-3 inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${getScoreColor(score)}`}
              >
                ★ {score.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-5">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white sm:text-4xl">
              {manga.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {manga.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-[#71717a] uppercase tracking-wider">
              Sinopsis
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              {manga.synopsis}
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-lg border border-[#1e2c31] bg-[#02090a] p-4">
            <h3 className="mb-1 text-sm font-semibold text-white">
              ¿Tienes dudas?
            </h3>
            <p className="text-sm text-[#a1a1aa]">
              Contáctanos por{" "}
              <a href="mailto:everburga@gmail.com" className="text-neon hover:underline">
                everburga@gmail.com
              </a>{" "}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
