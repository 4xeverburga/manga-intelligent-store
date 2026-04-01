import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/core/domain/entities";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (mangaId: string, requestedBy?: "user" | "ai") => void;
  updateQuantity: (mangaId: string, quantity: number, requestedBy?: "user" | "ai") => void;
  approveItem: (mangaId: string) => void;
  clearAISuggestions: () => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.mangaId === item.mangaId)) return state;
          return { items: [...state.items, item] };
        }),

      removeItem: (mangaId, requestedBy = "user") =>
        set((state) => {
          if (requestedBy === "ai") {
            // AI can only remove items it suggested
            return {
              items: state.items.filter(
                (i) => !(i.mangaId === mangaId && i.source === "ai-suggested")
              ),
            };
          }
          // User can remove anything
          return { items: state.items.filter((i) => i.mangaId !== mangaId) };
        }),

      updateQuantity: (mangaId, quantity, requestedBy = "user") =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.mangaId !== mangaId) return i;
            // AI cannot modify manual items
            if (requestedBy === "ai" && i.source === "manual") return i;
            return { ...i, quantity: Math.max(1, quantity) };
          }),
        })),

      approveItem: (mangaId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.mangaId === mangaId ? { ...i, source: "manual" as const } : i
          ),
        })),

      clearAISuggestions: () =>
        set((state) => ({
          items: state.items.filter((i) => i.source !== "ai-suggested"),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "hablemos-manga-cart",
    }
  )
);

// Computed selectors (used outside the store)
export const selectTotalItems = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.quantity, 0);

export const selectTotalPrice = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.quantity, 0) * 1.0;

export const selectManualItems = (state: CartState) =>
  state.items.filter((i) => i.source === "manual");

export const selectAIItems = (state: CartState) =>
  state.items.filter((i) => i.source === "ai-suggested");
