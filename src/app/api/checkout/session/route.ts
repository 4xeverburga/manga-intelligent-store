import { NextResponse } from "next/server";
import { NiubizAdapter } from "@/infrastructure/payment/NiubizAdapter";
import { CreateCheckoutSession } from "@/core/application/use-cases/CreateCheckoutSession";
import { supabase } from "@/infrastructure/db/client";

const createCheckoutSession = new CreateCheckoutSession(new NiubizAdapter());

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, purchaseNumber } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    if (!purchaseNumber || typeof purchaseNumber !== "string") {
      return NextResponse.json(
        { error: "purchaseNumber is required" },
        { status: 400 }
      );
    }

    // Look up authoritative total from DB — never trust client amount
    const { data: order } = await supabase
      .from("orders")
      .select("total_amount, status")
      .eq("id", orderId)
      .single();

    if (!order || order.status !== "pending") {
      return NextResponse.json(
        { error: "Order not found or not pending" },
        { status: 404 }
      );
    }

    const amount = order.total_amount as number;

    const session = await createCheckoutSession.execute({ amount, orderId: purchaseNumber });

    return NextResponse.json({
      sessionToken: session.sessionToken,
      merchantId: session.merchantId,
      amount,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
