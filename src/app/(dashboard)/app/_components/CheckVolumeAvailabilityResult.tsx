"use client";

import { CheckCircle, XCircle, Package } from "lucide-react";

interface VolumeAvailability {
  volumeId: string;
  volumeNumber: number | null;
  title: string;
  imageUrl?: string | null;
  price: number;
  stock: number;
  canBeDropshipped: boolean;
  available: boolean;
}

export interface CheckVolumeAvailabilityOutput {
  found: boolean;
  message?: string;
  volumes?: VolumeAvailability[];
}

export function CheckVolumeAvailabilityResult({
  result,
}: {
  result: CheckVolumeAvailabilityOutput;
}) {
  if (!result.found || !result.volumes?.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <XCircle className="h-4 w-4 shrink-0" />
        {result.message ?? "No se encontraron volúmenes."}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {result.volumes.map((v) => (
        <div
          key={v.volumeId}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            v.available
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {v.available ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-medium">
            Vol. {v.volumeNumber} — {v.title}
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs opacity-70">
            <Package className="h-3 w-3" />
            {v.stock > 0
              ? `${v.stock} en stock`
              : v.canBeDropshipped
              ? "Bajo pedido"
              : "Sin stock"}
          </span>
          <span className="text-xs opacity-70">S/ {v.price.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
