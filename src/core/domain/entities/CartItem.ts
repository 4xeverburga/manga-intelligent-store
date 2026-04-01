import type { Manga } from "./Manga";

export type CartItemSource = "manual" | "ai-suggested";

export interface CartItem {
  mangaId: string;
  manga: Manga;
  quantity: number;
  source: CartItemSource;
  addedAt: Date;
}
