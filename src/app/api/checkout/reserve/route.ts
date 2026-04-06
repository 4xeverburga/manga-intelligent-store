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
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    for (const item of items as CartItemPayload[]) {
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
      (items as CartItemPayload[]).map((i) => ({
        volumeId: i.volumeId,
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice ?? 1.0,
      }))
    );

    return NextResponse.json(reservation);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Stock insuficiente para uno o más volúmenes" },
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
