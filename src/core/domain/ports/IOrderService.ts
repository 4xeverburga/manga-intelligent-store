import type { Order, OrderItem } from "@/core/domain/entities/Order";

export interface StockCheckResult {
  volumeId: string;
  title: string;
  requested: number;
  available: number;
  canBeDropshipped: boolean;
}

export interface IOrderService {
  /** Validate stock for all items. Returns items that are insufficient. */
  validateStock(
    items: Pick<OrderItem, "volumeId" | "title" | "quantity">[]
  ): Promise<StockCheckResult[]>;

  /**
   * Atomically decrement stock and create the order.
   * Throws if any item would go below 0 (CHECK constraint).
   */
  fulfillOrder(
    items: OrderItem[],
    niubizTransactionId: string
  ): Promise<Order>;
}
