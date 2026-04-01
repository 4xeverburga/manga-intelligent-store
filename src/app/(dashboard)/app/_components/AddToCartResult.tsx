"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { useEffect } from "react";
import type { CartResult } from "./ChatMessage";

export function AddToCartResult({ result }: { result: CartResult }) {
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (result.success && result.mangaId && result.title) {
      addItem({
        mangaId: result.mangaId,
        title: result.title,
        price: 12.99,
        quantity: 1,
        source: "ai-suggested",
        addedAt: new Date(),
      });
    }
  }, [result, addItem]);

  if (!result.success) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        {result.error ?? "No se pudo agregar al carrito"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
      <CheckCircle className="h-4 w-4" />
      <strong>{result.title}</strong> agregado al carrito
    </div>
  );
}
