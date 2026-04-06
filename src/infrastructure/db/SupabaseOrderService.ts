import type { Order, OrderItem } from "@/core/domain/entities/Order";
import type {
  IOrderService,
  StockCheckResult,
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

      // Available if we have enough stock OR it can be dropshipped
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

  async fulfillOrder(
    items: OrderItem[],
    niubizTransactionId: string
  ): Promise<Order> {
    const totalAmount = items.reduce(
      (acc, i) => acc + i.quantity * i.unitPrice,
      0
    );
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

    // Call the atomic PG function via RPC
    const { data, error } = await supabase.rpc("fulfill_order", {
      p_transaction_id: niubizTransactionId,
      p_total_amount: totalAmount,
      p_item_count: itemCount,
      p_items: items.map((i) => ({
        volume_id: i.volumeId,
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
    });

    if (error) {
      // CHECK constraint violation or insufficient stock
      if (
        error.message.includes("stock_non_negative") ||
        error.message.includes("Insufficient stock")
      ) {
        throw new Error("INSUFFICIENT_STOCK");
      }
      throw new Error(`Order fulfillment failed: ${error.message}`);
    }

    const orderId = (data as { order_id: string }).order_id;

    return {
      id: orderId,
      niubizTransactionId,
      status: "completed",
      totalAmount,
      itemCount,
      items,
      createdAt: new Date(),
    };
  }
}
