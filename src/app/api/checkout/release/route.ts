import { NextResponse } from "next/server";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";

const orderService = new SupabaseOrderService();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    await orderService.releaseReservation(orderId);

    return NextResponse.json({ released: true });
  } catch (error) {
    console.error("Release error:", error);
    return NextResponse.json(
      { error: "Failed to release reservation" },
      { status: 500 }
    );
  }
}
