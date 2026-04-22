"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, ShoppingCart, Package, Truck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart";

export interface Volume {
  id: string;
  mangaId: string;
  volumeNumber: number | null;
  title: string;
  isbn: string | null;
  coverUrl: string | null;
  editor: string | null;
  editionYear: number | null;
  isCrossover: boolean;
  price: number;
  stock: number;
  canBeDropshipped: boolean;
}

function getAvailability(stock: number, canBeDropshipped: boolean) {
  if (stock > 0) {
    return {
      label: "Disponible",
      delivery: "1-3 días",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      icon: Package,
      available: true,
    };
  }
  if (canBeDropshipped) {
    return {
      label: "Por encargo",
      delivery: "2-3 semanas",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      icon: Truck,
      available: true,
    };
  }
  return {
    label: "No disponible",
    delivery: "",
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: Clock,
    available: false,
  };
}

export function VolumesList({
  volumes,
  mangaImageUrl,
}: {
  volumes: Volume[];
  mangaImageUrl: string;
}) {
  const [search, setSearch] = useState("");
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);

  const filtered = useMemo(() => {
    if (!search.trim()) return volumes;
    const q = search.toLowerCase();
    return volumes.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.editor?.toLowerCase().includes(q) ||
        v.isbn?.includes(q) ||
        String(v.volumeNumber).includes(q)
    );
  }, [volumes, search]);

  const regularVolumes = filtered.filter((v) => !v.isCrossover);
  const crossovers = filtered.filter((v) => v.isCrossover);

  if (volumes.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-white">
          Volúmenes disponibles ({volumes.length})
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <Input
            placeholder="Buscar volumen, ISBN, editorial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#061a1c] border-[#1e2c31] text-white placeholder:text-[#71717a] focus:border-neon"
          />
        </div>
      </div>

      {/* Regular volumes */}
      {regularVolumes.length > 0 && (
        <div className="space-y-2">
          {regularVolumes.map((vol) => (
            <VolumeRow
              key={vol.id}
              vol={vol}
              mangaImageUrl={mangaImageUrl}
              addItem={addItem}
              inCart={items.some((i) => i.volumeId === vol.id)}
            />
          ))}
        </div>
      )}

      {/* Crossovers */}
      {crossovers.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-[#71717a] uppercase tracking-wider">
            Crossovers y spin-offs
          </h3>
          <div className="space-y-2">
            {crossovers.map((vol) => (
              <VolumeRow
                key={vol.id}
                vol={vol}
                mangaImageUrl={mangaImageUrl}
                addItem={addItem}
                inCart={items.some((i) => i.volumeId === vol.id)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-[#71717a]">
          No se encontraron volúmenes para &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}

function VolumeRow({
  vol,
  mangaImageUrl,
  addItem,
  inCart,
}: {
  vol: Volume;
  mangaImageUrl: string;
  addItem: (item: import("@/core/domain/entities").CartItem) => void;
  inCart: boolean;
}) {
  const avail = getAvailability(vol.stock, vol.canBeDropshipped);
  const AvailIcon = avail.icon;
  const coverSrc = vol.coverUrl ?? mangaImageUrl;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1e2c31] bg-[#02090a] p-3 transition-colors hover:bg-[#061a1c]">
      <Image
        src={coverSrc}
        alt={vol.title}
        width={40}
        height={56}
        className="h-14 w-10 shrink-0 rounded object-cover"
      />
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <p className="truncate text-sm font-medium text-white">
          {vol.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717a]">
          {vol.editor && <span>{vol.editor}</span>}
          {vol.editionYear && <span>({vol.editionYear})</span>}
          {vol.isbn && (
            <span className="font-mono text-[10px]">ISBN {vol.isbn}</span>
          )}
          {vol.isCrossover && (
            <Badge variant="secondary" className="px-1 py-0 text-[9px]">
              Crossover
            </Badge>
          )}
        </div>
      </div>

      {/* Price */}
      <span className="shrink-0 text-sm font-semibold text-white">
        S/ {vol.price.toFixed(2)}
      </span>

      {/* Availability */}
      <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
        <div className="flex items-center gap-1">
          <AvailIcon className={`size-4 ${avail.color}`} />
          <span className={`text-xs font-medium ${avail.color}`}>{avail.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Package className="size-3 text-[#71717a]" />
          <span className="text-[10px] text-[#71717a]">
            {vol.stock > 0 && vol.canBeDropshipped
              ? `${vol.stock} en stock · Bajo pedido`
              : vol.stock > 0
                ? `${vol.stock} en stock`
                : vol.canBeDropshipped
                  ? "Bajo pedido"
                  : "Sin stock"}
          </span>
        </div>
      </div>

      {/* Add to cart */}
      <Button
        size="sm"
        variant={inCart ? "secondary" : "default"}
        disabled={inCart || !avail.available}
        onClick={() => {
          if (!inCart && avail.available) {
            addItem({
              mangaId: vol.mangaId,
              volumeId: vol.id,
              title: vol.title,
              imageUrl: coverSrc,
              price: vol.price,
              quantity: 1,
              source: "manual",
              addedAt: new Date(),
            });
          }
        }}
        className="shrink-0"
      >
        <ShoppingCart className="size-3.5" />
        <span className="hidden sm:inline">
          {inCart ? "En carrito" : !avail.available ? "Agotado" : "Agregar"}
        </span>
      </Button>
    </div>
  );
}
