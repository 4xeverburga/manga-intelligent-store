import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { mangas } from "@/infrastructure/db/schema";
import { eq, sql } from "drizzle-orm";

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
  const [manga] = await db
    .select({
      id: mangas.id,
      embedding: mangas.embedding,
    })
    .from(mangas)
    .where(eq(mangas.id, mangaId))
    .limit(1);

  if (!manga) {
    return NextResponse.json({ error: "Manga not found" }, { status: 404 });
  }

  if (!manga.embedding) {
    return NextResponse.json(
      { error: "Manga has no embedding" },
      { status: 422 }
    );
  }

  const vecStr = `[${manga.embedding.join(",")}]`;
  const results = await db.execute(
    sql`SELECT * FROM match_mangas(${vecStr}::vector(3072), 0.3, 7)`
  );

  // Filter out the source manga itself
  const similar = (results as unknown as Array<Record<string, unknown>>)
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
