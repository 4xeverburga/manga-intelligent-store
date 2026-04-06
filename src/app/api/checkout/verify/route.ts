import { NextResponse } from "next/server";
import { NiubizAdapter } from "@/infrastructure/payment/NiubizAdapter";
import { VerifyTransaction } from "@/core/application/use-cases/VerifyTransaction";

const verifyTransaction = new VerifyTransaction(new NiubizAdapter());

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, merchantId } = body;

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      );
    }

    const result = await verifyTransaction.execute({
      transactionId,
      merchantId: merchantId || process.env.NIUBIZ_MERCHANT_ID!,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Checkout verify error:", error);
    return NextResponse.json(
      { success: false, errorMessage: "Verification failed" },
      { status: 500 }
    );
  }
}
