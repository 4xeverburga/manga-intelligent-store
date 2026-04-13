import { NextResponse } from "next/server";
import { NiubizAdapter } from "@/infrastructure/payment/NiubizAdapter";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";
import { ConfirmOrder } from "@/core/application/use-cases/FulfillOrder";
import { supabase } from "@/infrastructure/db/client";

const confirmOrder = new ConfirmOrder(
  new NiubizAdapter(),
  new SupabaseOrderService()
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, merchantId, orderId, purchaseNumber } = body;

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

    // Look up authoritative amount and purchase_number from DB
    const { data: order } = await supabase
      .from("orders")
      .select("total_amount, purchase_number")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const amount = order.total_amount as number;
    const pn = purchaseNumber || String(order.purchase_number);

    console.log("[verify] orderId:", orderId, "amount:", amount, "purchaseNumber:", pn, "transactionToken:", transactionId);

    const result = await confirmOrder.execute({
      orderId,
      transactionId,
      merchantId: merchantId || process.env.NIUBIZ_MERCHANT_ID!,
      purchaseNumber: pn,
      amount,
    });

    if (!result.success) {
      console.error("[verify] Authorization failed:", result.errorMessage);
      return NextResponse.json(
        { success: false, errorMessage: result.errorMessage },
        { status: 200 }
      );
    }

    console.log("[verify] Authorization success, txnId:", result.transactionId);

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      orderId,
      amount,
    });
  } catch (error) {
    console.error("Checkout verify error:", error);
    return NextResponse.json(
      { success: false, errorMessage: "Verification failed" },
      { status: 500 }
    );
  }
}
