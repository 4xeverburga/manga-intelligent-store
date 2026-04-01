"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h2 className="text-xl font-bold">Error en el dashboard</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocurrió un problema al cargar el dashboard. Intenta de nuevo.
      </p>
      <Button onClick={reset} variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
