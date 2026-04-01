import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/infrastructure/db/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mangaId = body?.mangaId;

  if (!mangaId || typeof mangaId !== "string") {
    return NextResponse.json(
      { error: "mangaId is required" },
      { status: 400 }
    );
  }

  // Get the manga's embedding
  const { data: manga } = await supabase
    .from("mangas")
    .select("id, embedding")
    .eq("id", mangaId)
    .limit(1)
    .single();

  if (!manga) {
    return NextResponse.json({ error: "Manga not found" }, { status: 404 });
  }

  if (!manga.embedding) {
    return NextResponse.json(
      { error: "Manga has no embedding" },
      { status: 422 }
    );
  }

  const { data: results } = await supabase.rpc("match_mangas", {
    query_embedding: JSON.stringify(manga.embedding),
    match_threshold: 0.3,
    match_count: 7,
  });

  // Filter out the source manga itself
  const similar = ((results ?? []) as Array<Record<string, unknown>>)
    .filter((r) => r.id !== mangaId)
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      title: r.title,
      synopsis:
        typeof r.synopsis === "string" ? r.synopsis.slice(0, 200) : "",
      genres: r.genres,
      score: r.score,
      imageUrl: r.image_url,
      similarity: r.similarity,
    }));

  return NextResponse.json(similar);
}
