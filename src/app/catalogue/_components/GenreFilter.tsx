"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenreFilterProps {
  activeGenres: string[];
  onToggle: (genre: string) => void;
  onClear: () => void;
}

export function GenreFilter({ activeGenres, onToggle, onClear }: GenreFilterProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/mangas/genres")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setGenres)
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = search
    ? genres.filter((g) => g.toLowerCase().includes(search.toLowerCase()))
    : genres;

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="default"
        onClick={() => setOpen(!open)}
        className="gap-1.5"
      >
        <span>Géneros</span>
        {activeGenres.length > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-neon text-[10px] font-bold text-black">
            {activeGenres.length}
          </span>
        )}
        <ChevronDown
          data-icon="inline-end"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#1e2c31] bg-[#061a1c] p-2 shadow-xl">
          <input
            type="text"
            placeholder="Buscar género..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 w-full rounded-lg border border-[#1e2c31] bg-transparent px-3 py-1.5 text-sm text-white outline-none placeholder:text-[#71717a] focus:border-neon"
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-2 text-center text-xs text-[#71717a]">
                No se encontraron géneros
              </p>
            ) : (
              filtered.map((genre) => {
                const active = activeGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => onToggle(genre)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white hover:bg-[#102620]"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border ${
                        active
                          ? "border-neon bg-neon text-black"
                          : "border-[#3f3f46]"
                      }`}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    {genre}
                  </button>
                );
              })
            )}
          </div>
          {activeGenres.length > 0 && (
            <button
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="mt-2 w-full rounded-lg border-t border-[#1e2c31] py-1.5 text-center text-xs text-[#a1a1aa] hover:text-white"
            >
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
