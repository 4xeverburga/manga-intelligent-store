import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/infrastructure/db/client";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ error: "ids param required" }, { status: 400 });
  }

  const volumeIds = ids.split(",").filter(Boolean);
  if (volumeIds.length === 0 || volumeIds.length > 50) {
    return NextResponse.json(
      { error: "Provide 1-50 volume IDs" },
      { status: 400 }
    );
  }

  const { data: rows } = await supabase
    .from("inventory")
    .select("volume_id, stock, can_be_dropshipped, manga_volumes!inner(price)")
    .in("volume_id", volumeIds);

  const stock: Record<string, { stock: number; canBeDropshipped: boolean; price: number }> =
    {};
  for (const r of rows ?? []) {
    const mv = Array.isArray(r.manga_volumes) ? r.manga_volumes[0] : r.manga_volumes;
    stock[r.volume_id as string] = {
      stock: r.stock as number,
      canBeDropshipped: r.can_be_dropshipped as boolean,
      price: (mv?.price as number) ?? 0,
    };
  }

  return NextResponse.json(stock);
}
