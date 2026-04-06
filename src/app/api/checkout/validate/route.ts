import { NextResponse } from "next/server";
import { SupabaseOrderService } from "@/infrastructure/db/SupabaseOrderService";
import { ValidateStock } from "@/core/application/use-cases/ValidateStock";

const validateStock = new ValidateStock(new SupabaseOrderService());

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

    const insufficient = await validateStock.execute({ items });

    if (insufficient.length > 0) {
      return NextResponse.json({
        valid: false,
        insufficient,
      });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Stock validation error:", error);
    return NextResponse.json(
      { error: "Stock validation failed" },
      { status: 500 }
    );
  }
}
