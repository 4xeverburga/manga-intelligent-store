"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer } from "@/components/motion";
import { MangaCard } from "@/app/catalogue/_components/MangaCard";
import { GenreFilter } from "@/app/catalogue/_components/GenreFilter";
import { SearchBar } from "@/app/catalogue/_components/SearchBar";
import { SimilarModal } from "@/app/catalogue/_components/SimilarModal";
import { MangaCardSkeleton } from "@/app/catalogue/_components/MangaCardSkeleton"

interface MangaItem {
  id: string;
  jikanId: number;
  title: string;
  synopsis: string;
  genres: string[];
  imageUrl: string;
  score: number | null;
  popularity: number | null;
}

export function CatalogueClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mangas, setMangas] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [similarMangaId, setSimilarMangaId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const currentPage = useRef(1);

  const activeGenres = searchParams.get("genres")?.split(",").filter(Boolean) ?? [];
  const searchQuery = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const fetchMangas = useCallback(
    async (page: number, append: boolean = false) => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "24");
        if (activeGenres.length > 0) params.set("genres", activeGenres.join(","));
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(`/api/mangas?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();

        if (append) {
          setMangas((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newItems = (json.data as MangaItem[]).filter((m) => !existingIds.has(m.id));
            return [...prev, ...newItems];
          });
        } else {
          setMangas(json.data);
        }
        setNextPage(json.nextPage);
        setTotal(json.total);
        currentPage.current = page;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeGenres.join(","), searchQuery]
  );

  // Fetch on filter/search change
  useEffect(() => {
    currentPage.current = 1;
    fetchMangas(1);
  }, [fetchMangas]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPage && !loadingMore) {
          fetchMangas(nextPage, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextPage, loadingMore, fetchMangas]);

  const handleGenreToggle = (genre: string) => {
    const newGenres = activeGenres.includes(genre)
      ? activeGenres.filter((g) => g !== genre)
      : [...activeGenres, genre];
    updateParams({ genres: newGenres.length > 0 ? newGenres.join(",") : null });
  };

  const handleGenreClear = () => {
    updateParams({ genres: null });
  };

  const handleSearch = (value: string) => {
    updateParams({ search: value || null });
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <GenreFilter
          activeGenres={activeGenres}
          onToggle={handleGenreToggle}
          onClear={handleGenreClear}
        />
        <SearchBar value={searchQuery} onChange={handleSearch} />
      </div>

      {/* Active filter badges */}
      {activeGenres.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => handleGenreToggle(genre)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              {genre}
              <span className="ml-1 text-white/40">&times;</span>
            </button>
          ))}
          <button
            onClick={handleGenreClear}
            className="text-xs text-[#a1a1aa] underline-offset-2 hover:underline hover:text-white"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Results count */}
      <p className="mb-4 text-sm text-[#a1a1aa]">
        {total} manga{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 24 }).map((_, i) => (
            <MangaCardSkeleton key={i} />
          ))}
        </div>
      ) : mangas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-[#a1a1aa]">No se encontraron resultados</p>
          <button
            onClick={() => {
              handleGenreClear();
              handleSearch("");
            }}
            className="mt-4 text-sm text-neon underline-offset-2 hover:underline"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeGenres.join(",")}-${searchQuery}`}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {mangas.map((manga) => (
              <MangaCard
                key={manga.id}
                manga={manga}
                onFindSimilar={() => setSimilarMangaId(manga.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <MangaCardSkeleton key={`loading-${i}`} />
          ))}
        </div>
      )}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {/* End of results */}
      {!loading && !nextPage && mangas.length > 0 && (
        <p className="mt-8 text-center text-sm text-[#71717a]">
          Has llegado al final del catálogo
        </p>
      )}

      {/* Similar modal */}
      <SimilarModal
        mangaId={similarMangaId}
        onClose={() => setSimilarMangaId(null)}
      />
    </div>
  );
}
