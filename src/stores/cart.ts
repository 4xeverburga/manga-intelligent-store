import { create } from "zustand";
import type { CartItem } from "@/core/domain/entities";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (mangaId: string) => void;
  clearAISuggestions: () => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      if (state.items.some((i) => i.mangaId === item.mangaId)) return state;
      return { items: [...state.items, item] };
    }),

  removeItem: (mangaId) =>
    set((state) => ({
      items: state.items.filter((i) => i.mangaId !== mangaId),
    })),

  clearAISuggestions: () =>
    set((state) => ({
      items: state.items.filter((i) => i.source !== "ai-suggested"),
    })),

  clear: () => set({ items: [] }),
}));
