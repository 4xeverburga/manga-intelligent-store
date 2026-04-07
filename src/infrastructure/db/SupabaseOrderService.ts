import type { OrderItem } from "@/core/domain/entities/Order";
import type {
  IOrderService,
  StockCheckResult,
  ReservationResult,
} from "@/core/domain/ports/IOrderService";
import { supabase } from "@/infrastructure/db/client";

export class SupabaseOrderService implements IOrderService {
  async validateStock(
    items: Pick<OrderItem, "volumeId" | "title" | "quantity">[]
  ): Promise<StockCheckResult[]> {
    const volumeIds = items.map((i) => i.volumeId);

    const { data: rows } = await supabase
      .from("inventory")
      .select("volume_id, stock, can_be_dropshipped")
      .in("volume_id", volumeIds);

    const stockMap = new Map(
      (rows ?? []).map((r) => [
        r.volume_id as string,
        {
          stock: r.stock as number,
          canBeDropshipped: r.can_be_dropshipped as boolean,
        },
      ])
    );

    const insufficient: StockCheckResult[] = [];
    for (const item of items) {
      const inv = stockMap.get(item.volumeId);
      const available = inv?.stock ?? 0;
      const canBeDropshipped = inv?.canBeDropshipped ?? false;

      if (available >= item.quantity || canBeDropshipped) continue;

      insufficient.push({
        volumeId: item.volumeId,
        title: item.title,
        requested: item.quantity,
        available,
        canBeDropshipped,
      });
    }

    return insufficient;
  }

  async reserveStock(
    items: Pick<OrderItem, "volumeId" | "title" | "quantity">[],
    ttlSeconds = 180
  ): Promise<ReservationResult> {
    // Look up authoritative prices from DB — never trust client
    const volumeIds = items.map((i) => i.volumeId);
    const { data: priceRows } = await supabase
      .from("manga_volumes")
      .select("id, price")
      .in("id", volumeIds);

    const priceMap = new Map(
      (priceRows ?? []).map((r) => [r.id as string, r.price as number])
    );

    const pricedItems = items.map((i) => {
      const price = priceMap.get(i.volumeId);
      if (price == null) throw new Error(`Volume ${i.volumeId} not found`);
      return { ...i, unitPrice: price };
    });

    const totalAmount = pricedItems.reduce(
      (acc, i) => acc + i.quantity * i.unitPrice,
      0
    );
    const itemCount = pricedItems.reduce((acc, i) => acc + i.quantity, 0);

    const { data, error } = await supabase.rpc("reserve_stock", {
      p_total_amount: totalAmount,
      p_item_count: itemCount,
      p_items: pricedItems.map((i) => ({
        volume_id: i.volumeId,
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
      p_ttl_seconds: ttlSeconds,
    });

    if (error) {
      if (
        error.message.includes("stock_non_negative") ||
        error.message.includes("Insufficient stock") ||
        error.message.includes("INSUFFICIENT_STOCK")
      ) {
        throw new Error("INSUFFICIENT_STOCK");
      }
      if (error.message.includes("DROPSHIP_LIMIT_EXCEEDED")) {
        throw new Error(error.message);
      }
      throw new Error(`Reservation failed: ${error.message}`);
    }

    const result = data as { order_id: string; expires_at: string };
    return { orderId: result.order_id, expiresAt: result.expires_at };
  }

  async confirmOrder(
    orderId: string,
    niubizTransactionId: string
  ): Promise<void> {
    const { error } = await supabase.rpc("confirm_order", {
      p_order_id: orderId,
      p_transaction_id: niubizTransactionId,
    });

    if (error) {
      if (error.message.includes("expired or not pending")) {
        throw new Error("RESERVATION_EXPIRED");
      }
      throw new Error(`Confirm failed: ${error.message}`);
    }
  }

  async releaseReservation(orderId: string): Promise<void> {
    const { error } = await supabase.rpc("release_reservation", {
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(`Release failed: ${error.message}`);
    }
  }

  async updateDeliveryInfo(
    orderId: string,
    info: { email?: string; phone?: string; deliveryAddress?: string }
  ): Promise<void> {
    const update: Record<string, string> = {};
    if (info.email) update.email = info.email;
    if (info.phone) update.phone = info.phone;
    if (info.deliveryAddress) update.delivery_address = info.deliveryAddress;

    if (Object.keys(update).length === 0) return;

    const { error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", orderId);

    if (error) {
      throw new Error(`Update delivery info failed: ${error.message}`);
    }
  }
}
