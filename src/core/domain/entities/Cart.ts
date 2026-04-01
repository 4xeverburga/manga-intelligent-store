import type { CartItem } from "./CartItem";

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}
