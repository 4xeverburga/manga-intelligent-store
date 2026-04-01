import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/infrastructure/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") ?? 24)));
  const genresParam = searchParams.get("genres");
  const search = searchParams.get("search")?.trim();
  const offset = (page - 1) * limit;

  // Build count query
  let countQuery = supabase
    .from("mangas")
    .select("*", { count: "exact", head: true });

  // Build data query
  let dataQuery = supabase
    .from("mangas")
    .select("id, jikan_id, title, synopsis, genres, image_url, score, popularity")
    .order("popularity", { ascending: true })
    .range(offset, offset + limit - 1);

  if (genresParam) {
    const genres = genresParam.split(",").map((g) => g.trim()).filter(Boolean);
    if (genres.length > 0) {
      // AND filter: manga must have ALL selected genres
      countQuery = countQuery.contains("genres", genres);
      dataQuery = dataQuery.contains("genres", genres);
    }
  }

  if (search) {
    countQuery = countQuery.ilike("title", `%${search}%`);
    dataQuery = dataQuery.ilike("title", `%${search}%`);
  }

  const [{ count: total }, { data }] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  const totalCount = total ?? 0;
  const totalPages = Math.ceil(totalCount / limit);
  const nextPage = page < totalPages ? page + 1 : null;

  // Map snake_case to camelCase for frontend
  const mapped = (data ?? []).map((r) => ({
    id: r.id,
    jikanId: r.jikan_id,
    title: r.title,
    synopsis: r.synopsis,
    genres: r.genres,
    imageUrl: r.image_url,
    score: r.score,
    popularity: r.popularity,
  }));

  return NextResponse.json({
    data: mapped,
    nextPage,
    total: totalCount,
    page,
    limit,
  });
}
