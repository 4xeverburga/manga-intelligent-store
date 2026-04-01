import { NextResponse } from "next/server";
import { NiubizAdapter } from "@/infrastructure/payment/NiubizAdapter";

const niubiz = new NiubizAdapter();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, orderId } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const session = await niubiz.createSession(amount, orderId);

    return NextResponse.json({
      sessionToken: session.sessionToken,
      merchantId: session.merchantId,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
