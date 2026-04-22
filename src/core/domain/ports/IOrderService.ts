import type { OrderItem } from "@/core/domain/entities/Order";

export interface StockCheckResult {
  volumeId: string;
  title: string;
  requested: number;
  available: number;
  canBeDropshipped: boolean;
}

export interface ReservationResult {
  orderId: string;
  expiresAt: string; // ISO timestamp
  purchaseNumber: string; // serial numeric, max 12 digits
}

export interface IOrderService {
  /** Validate stock for all items. Returns items that are insufficient. */
  validateStock(
    items: Pick<OrderItem, "volumeId" | "title" | "quantity">[]
  ): Promise<StockCheckResult[]>;

  /**
   * Atomically decrement stock and create a pending order with TTL.
   * Prices are looked up server-side from the DB — never trust client prices.
   * Throws "INSUFFICIENT_STOCK" if any item would go below 0.
   */
  reserveStock(
    items: Pick<OrderItem, "volumeId" | "title" | "quantity">[],
    ttlSeconds?: number
  ): Promise<ReservationResult>;

  /**
   * Mark a pending (non-expired) order as completed with the Niubiz txn ID.
   * Throws if the order is expired or not pending.
   */
  confirmOrder(orderId: string, niubizTransactionId: string): Promise<void>;

  /**
   * Restore stock for a pending order and mark it expired.
   * No-op if the order is already completed or expired.
   */
  releaseReservation(orderId: string): Promise<void>;

  /** Update delivery contact info on an existing order. */
  updateDeliveryInfo(
    orderId: string,
    info: { email?: string; phone?: string; deliveryAddress?: string }
  ): Promise<void>;
}
