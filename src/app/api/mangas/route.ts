import { NextRequest, NextResponse } from "next/server";
import { SupabaseMangaRepository } from "@/infrastructure/db/DrizzleMangaRepository";
import { SearchMangas } from "@/core/application/use-cases/SearchMangas";

const searchMangas = new SearchMangas(new SupabaseMangaRepository());

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 24);
  const genresParam = searchParams.get("genres");
  const search = searchParams.get("search")?.trim() || undefined;

  const genres = genresParam
    ? genresParam.split(",").map((g) => g.trim()).filter(Boolean)
    : undefined;

  const result = await searchMangas.execute({ page, limit, genres, search });

  const mapped = result.data.map((m) => ({
    id: m.id,
    jikanId: m.jikanId,
    title: m.title,
    synopsis: m.synopsis,
    genres: m.genres,
    imageUrl: m.imageUrl,
    score: m.score,
    popularity: m.popularity,
  }));

  return NextResponse.json({
    data: mapped,
    nextPage: result.nextPage,
    total: result.total,
    page: result.page,
    limit: result.limit,
  });
}
