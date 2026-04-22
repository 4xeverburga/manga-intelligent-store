import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CatalogueClient } from "@/app/catalogue/_components/CatalogueClient";

export const metadata = {
  title: "Catálogo | Hablemos Manga",
  description: "Explora nuestro catálogo de 500+ mangas con filtros, búsqueda y recomendaciones inteligentes.",
};

export default function CataloguePage() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 lg:px-16">
          <div className="mb-10">
            <h1 className="text-4xl font-light tracking-tight text-white sm:text-5xl lg:text-6xl">
              Catálogo
            </h1>
            <p className="mt-3 text-lg text-[#a1a1aa]">
              Explora nuestra colección de mangas. Filtra por género, busca por título o descubre similares.
            </p>
          </div>
          <Suspense fallback={<CatalogueSkeletonGrid />}>
            <CatalogueClient />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function CatalogueSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-[#1e2c31] bg-[#02090a]">
          <div className="aspect-[3/4] rounded-t-xl bg-[#061a1c]" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 rounded bg-[#061a1c]" />
            <div className="h-3 w-1/2 rounded bg-[#061a1c]" />
            <div className="flex gap-1">
              <div className="h-5 w-12 rounded-full bg-[#061a1c]" />
              <div className="h-5 w-12 rounded-full bg-[#061a1c]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
