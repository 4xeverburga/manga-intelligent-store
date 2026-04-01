import Link from "next/link";
import { BookX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <BookX className="h-16 w-16 text-muted-foreground/40" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">
        Esta página no existe en nuestro catálogo
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-cta text-cta-foreground hover:bg-cta/90 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
