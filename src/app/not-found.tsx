import Link from "next/link";
import { BookX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4 text-center">
      <BookX className="h-16 w-16 text-[#71717a]/40" />
      <h1 className="text-5xl font-light text-white">404</h1>
      <p className="text-lg text-[#a1a1aa]">
        Esta página no existe en nuestro catálogo
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
