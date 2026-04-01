"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <AlertTriangle className="h-16 w-16 text-amber-500" />
      <h1 className="text-2xl font-bold">Algo salió mal</h1>
      <p className="max-w-md text-muted-foreground">
        Ocurrió un error inesperado. Puedes intentar de nuevo o volver al
        inicio.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          Reintentar
        </Button>
        <a
          href="/"
          className={buttonVariants({ className: "bg-cta text-cta-foreground hover:bg-cta/90" })}
        >
          Ir al inicio
        </a>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
