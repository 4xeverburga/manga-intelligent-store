"use client";

import Image from "next/image";
import { ShoppingCart, Package, Truck, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";

interface MangaDetailProps {
  manga: {
    id: string;
    title: string;
    synopsis: string;
    genres: string[];
    imageUrl: string;
    score: number | null;
    popularity: number | null;
    stock: number;
    canBeDropshipped: boolean;
  };
}

function getAvailability(stock: number, canBeDropshipped: boolean) {
  if (stock > 0) {
    return {
      label: "Disponible",
      detail: `${stock} unidad${stock > 1 ? "es" : ""} en stock`,
      delivery: "Entrega en 1-3 días hábiles",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 ring-emerald-500/20",
      icon: Package,
      available: true,
    };
  }
  if (canBeDropshipped) {
    return {
      label: "Disponible por encargo",
      detail: "Se solicita al proveedor al comprar",
      delivery: "Entrega estimada: 2-3 semanas",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 ring-amber-500/20",
      icon: Truck,
      available: true,
    };
  }
  return {
    label: "No disponible",
    detail: "Actualmente agotado",
    delivery: "Sin fecha estimada de reposición",
    color: "text-red-400",
    bgColor: "bg-red-500/10 ring-red-500/20",
    icon: Clock,
    available: false,
  };
}

function getScoreColor(score: number) {
  if (score >= 8) return "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30";
  if (score >= 6) return "bg-amber-500/20 text-amber-400 ring-amber-500/30";
  return "bg-red-500/20 text-red-400 ring-red-500/30";
}

export function MangaDetail({ manga }: MangaDetailProps) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const inCart = items.some((i) => i.mangaId === manga.id);
  const score = manga.score ?? 0;
  const availability = getAvailability(manga.stock, manga.canBeDropshipped);
  const AvailabilityIcon = availability.icon;

  return (
    <div>
      <Link
        href="/catalogue"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al catálogo
      </Link>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Cover image */}
        <div className="shrink-0">
          <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-xl ring-1 ring-foreground/10 md:w-[280px]">
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Sinopsis
            </h2>
            <p className="text-sm leading-relaxed text-foreground/80">
              {manga.synopsis}
            </p>
          </div>

          {/* Availability & Delivery */}
          <div className={`rounded-lg p-4 ring-1 ring-inset ${availability.bgColor}`}>
            <div className="flex items-center gap-2">
              <AvailabilityIcon className={`size-5 ${availability.color}`} />
              <span className={`font-semibold ${availability.color}`}>
                {availability.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/60">{availability.detail}</p>
            <p className="mt-0.5 text-sm text-foreground/60">{availability.delivery}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={inCart || !availability.available}
              onClick={() => {
                if (!inCart && availability.available) {
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
              className="gap-2"
            >
              <ShoppingCart className="size-4" />
              {inCart ? "Ya en carrito" : !availability.available ? "No disponible" : "Agregar al carrito"}
            </Button>
          </div>

          {/* Contact */}
          <div className="rounded-lg border border-border/40 p-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              ¿Tienes dudas?
            </h3>
            <p className="text-sm text-muted-foreground">
              Contáctanos por{" "}
              <a href="mailto:contacto@hablemosmanga.com" className="text-primary hover:underline">
                contacto@hablemosmanga.com
              </a>{" "}
              o escríbenos en el{" "}
              <Link href="/app" className="text-primary hover:underline">
                chat asistido por IA
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
