import { NextResponse } from "next/server";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";

const orderService = new SupabaseOrderService();

interface CartItemPayload {
  volumeId: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export async function POST(req: Request) {
  let parsedItems: CartItemPayload[] = [];

  try {
    const body = await req.json();
    const { items, email, phone, deliveryAddress } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    parsedItems = items as CartItemPayload[];

    for (const item of parsedItems) {
      if (
        !item.volumeId ||
        !item.title ||
        !item.quantity ||
        item.quantity < 1
      ) {
        return NextResponse.json(
          { error: "Each item must have volumeId, title, and quantity >= 1" },
          { status: 400 }
        );
      }
    }

    const reservation = await orderService.reserveStock(
      parsedItems.map((i) => ({
        volumeId: i.volumeId,
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice ?? 1.0,
      }))
    );

    // Save delivery info on the order
    if (email || phone || deliveryAddress) {
      await orderService.updateDeliveryInfo(reservation.orderId, {
        email: typeof email === "string" ? email : undefined,
        phone: typeof phone === "string" ? phone : undefined,
        deliveryAddress:
          typeof deliveryAddress === "string" ? deliveryAddress : undefined,
      });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      const insufficient = await orderService.validateStock(
        parsedItems.map((i) => ({
          volumeId: i.volumeId,
          title: i.title,
          quantity: i.quantity,
        }))
      );
      return NextResponse.json(
        {
          error: "Stock insuficiente para uno o más volúmenes",
          insufficient,
        },
        { status: 409 }
      );
    }
    console.error("Reserve error:", error);
    return NextResponse.json(
      { error: "Failed to reserve stock" },
      { status: 500 }
    );
  }
}
