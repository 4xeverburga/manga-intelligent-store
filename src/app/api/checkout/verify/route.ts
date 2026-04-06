import { NextResponse } from "next/server";
import { NiubizAdapter } from "@/infrastructure/payment/NiubizAdapter";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";
import { FulfillOrder } from "@/core/application/use-cases/FulfillOrder";

const fulfillOrder = new FulfillOrder(
  new NiubizAdapter(),
  new SupabaseOrderService()
);

interface CartItemPayload {
  volumeId: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, merchantId, items } = body;

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    // Validate item shape
    for (const item of items as CartItemPayload[]) {
      if (!item.volumeId || !item.title || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: "Each item must have volumeId, title, and quantity >= 1" },
          { status: 400 }
        );
      }
    }

    const result = await fulfillOrder.execute({
      transactionId,
      merchantId: merchantId || process.env.NIUBIZ_MERCHANT_ID!,
      items: (items as CartItemPayload[]).map((i) => ({
        volumeId: i.volumeId,
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice ?? 1.0,
      })),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, errorMessage: result.errorMessage },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId,
      orderId: result.order.id,
    });
  } catch (error) {
    console.error("Checkout verify error:", error);
    return NextResponse.json(
      { success: false, errorMessage: "Verification failed" },
      { status: 500 }
    );
  }
}
