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
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Catálogo
            </h1>
            <p className="mt-2 text-muted-foreground">
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
        <div key={i} className="animate-pulse rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="aspect-[3/4] rounded-t-xl bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="flex gap-1">
              <div className="h-5 w-12 rounded-full bg-muted" />
              <div className="h-5 w-12 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
