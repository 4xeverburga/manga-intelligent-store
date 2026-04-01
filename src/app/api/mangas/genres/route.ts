import { NextResponse } from "next/server";
import { supabase } from "@/infrastructure/db/client";

export async function GET() {
  const { data: mangas } = await supabase
    .from("mangas")
    .select("genres");

  const genreSet = new Set<string>();
  (mangas ?? []).forEach((m) =>
    (m.genres as string[]).forEach((g) => genreSet.add(g))
  );

  return NextResponse.json([...genreSet].sort());
}
