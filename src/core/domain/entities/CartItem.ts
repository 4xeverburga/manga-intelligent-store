export type CartItemSource = "manual" | "ai-suggested";

export interface CartItem {
  mangaId: string;
  volumeId: string;
  title: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  source: CartItemSource;
  addedAt: Date;
}
