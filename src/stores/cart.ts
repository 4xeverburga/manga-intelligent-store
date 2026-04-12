import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/core/domain/entities";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (volumeId: string, requestedBy?: "user" | "ai") => void;
  updateQuantity: (volumeId: string, quantity: number, requestedBy?: "user" | "ai") => void;
  updatePrice: (volumeId: string, price: number) => void;
  approveItem: (volumeId: string) => void;
  clearAISuggestions: () => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.volumeId === item.volumeId)) return state;
          return { items: [...state.items, item] };
        }),

      removeItem: (volumeId, requestedBy = "user") =>
        set((state) => {
          if (requestedBy === "ai") {
            return {
              items: state.items.filter(
                (i) => !(i.volumeId === volumeId && i.source === "ai-suggested")
              ),
            };
          }
          return { items: state.items.filter((i) => i.volumeId !== volumeId) };
        }),

      updateQuantity: (volumeId, quantity, requestedBy = "user") =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.volumeId !== volumeId) return i;
            if (requestedBy === "ai" && i.source === "manual") return i;
            return { ...i, quantity: Math.max(1, quantity) };
          }),
        })),

      updatePrice: (volumeId, price) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.volumeId === volumeId && i.price !== price ? { ...i, price } : i
          ),
        })),

      approveItem: (volumeId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.volumeId === volumeId ? { ...i, source: "manual" as const } : i
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
  state.items.reduce((acc, i) => acc + i.quantity * i.price, 0);

export const selectManualItems = (state: CartState) =>
  state.items.filter((i) => i.source === "manual");

export const selectAIItems = (state: CartState) =>
  state.items.filter((i) => i.source === "ai-suggested");
