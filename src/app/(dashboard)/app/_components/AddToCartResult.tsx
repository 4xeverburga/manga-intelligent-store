"use client";

import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import type { CartResult } from "@/app/(dashboard)/app/_components/ChatMessage";

export function AddToCartResult({ result }: { result: CartResult }) {
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
      <span>
        Visita{" "}
        <Link href={`/catalogue/${result.mangaId}`} className="underline font-medium">
          {result.title}
        </Link>{" "}
        para elegir un volumen y agregarlo al carrito.
      </span>
    </div>
  );
}
