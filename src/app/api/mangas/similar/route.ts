import { NextRequest, NextResponse } from "next/server";
import { SupabaseMangaRepository } from "@/infrastructure/db/SupabaseMangaRepository";
import { FindSimilarMangas } from "@/core/application/use-cases/FindSimilarMangas";

const findSimilarMangas = new FindSimilarMangas(new SupabaseMangaRepository());

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mangaId = body?.mangaId;

  if (!mangaId || typeof mangaId !== "string") {
    return NextResponse.json(
      { error: "mangaId is required" },
      { status: 400 }
    );
  }

  try {
    const similar = await findSimilarMangas.execute(mangaId);

    const mapped = similar.map((r) => ({
      id: r.id,
      title: r.title,
      synopsis: r.synopsis.slice(0, 200),
      genres: r.genres,
      score: r.score,
      imageUrl: r.imageUrl,
      similarity: r.similarity,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Manga not found" ? 404
      : message === "Manga has no embedding" ? 422
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
