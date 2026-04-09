"use client";

import { useEffect } from "react";
import { CheckCircle, Circle, Package } from "lucide-react";
import { useCartStore } from "@/stores/cart";

export interface AddVolumeResult {
  success: boolean;
  volumeId?: string;
  volumeNumber?: number;
  title?: string;
  imageUrl?: string;
  price?: number;
  mangaId?: string;
  stock?: number;
  canBeDropshipped?: boolean;
  error?: string;
}

export function AddVolumeToCartResult({ result }: { result: AddVolumeResult }) {
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (
      result.success &&
      result.volumeId &&
      result.mangaId &&
      result.title &&
      result.price != null
    ) {
      addItem({
        mangaId: result.mangaId,
        volumeId: result.volumeId,
        title: result.title,
        imageUrl: result.imageUrl,
        price: result.price,
        quantity: 1,
        source: "ai-suggested",
        addedAt: new Date(),
      });
    }
    // Only run once when the result arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.volumeId]);

  if (!result.success) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
        <Circle className="h-4 w-4 shrink-0" />
        {result.error ?? "No se pudo agregar el volumen al carrito"}
      </div>
    );
  }

  const stockLabel =
    result.stock && result.stock > 0
      ? `${result.stock} en stock`
      : result.canBeDropshipped
      ? "Disponible bajo pedido"
      : "";

  return (
    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
      <CheckCircle className="h-4 w-4 shrink-0" />
      <span>
        <strong>{result.title}</strong> agregado al carrito como sugerencia.
        {stockLabel && (
          <>
            {" "}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Package className="h-3 w-3" />
              {stockLabel}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
