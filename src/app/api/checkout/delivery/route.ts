import { NextResponse } from "next/server";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";

const orderService = new SupabaseOrderService();

export async function POST(req: Request) {
  try {
    const { orderId, email, phone, deliveryAddress } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    await orderService.updateDeliveryInfo(orderId, {
      email: typeof email === "string" ? email : undefined,
      phone: typeof phone === "string" ? phone : undefined,
      deliveryAddress:
        typeof deliveryAddress === "string" ? deliveryAddress : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delivery info update error:", error);
    return NextResponse.json(
      { error: "Failed to update delivery info" },
      { status: 500 }
    );
  }
}
