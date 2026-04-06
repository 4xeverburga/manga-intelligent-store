import { NextResponse } from "next/server";
import { NiubizAdapter } from "@/infrastructure/payment/NiubizAdapter";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";
import { ConfirmOrder } from "@/core/application/use-cases/FulfillOrder";

const confirmOrder = new ConfirmOrder(
  new NiubizAdapter(),
  new SupabaseOrderService()
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, merchantId, orderId } = body;

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      );
    }

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const result = await confirmOrder.execute({
      orderId,
      transactionId,
      merchantId: merchantId || process.env.NIUBIZ_MERCHANT_ID!,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, errorMessage: result.errorMessage },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      orderId,
    });
  } catch (error) {
    console.error("Checkout verify error:", error);
    return NextResponse.json(
      { success: false, errorMessage: "Verification failed" },
      { status: 500 }
    );
  }
}
