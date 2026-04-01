import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { mangas } from "@/infrastructure/db/schema";
import { sql, ilike, and, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") ?? 24)));
  const genresParam = searchParams.get("genres");
  const search = searchParams.get("search")?.trim();
  const offset = (page - 1) * limit;

  const conditions = [];

  if (genresParam) {
    const genres = genresParam.split(",").map((g) => g.trim()).filter(Boolean);
    if (genres.length > 0) {
      // AND filter: manga must have ALL selected genres
      conditions.push(sql`${mangas.genres} @> ARRAY[${sql.join(
        genres.map((g) => sql`${g}`),
        sql`, `
      )}]::text[]`);
    }
  }

  if (search) {
    conditions.push(ilike(mangas.title, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, data] = await Promise.all([
    db.select({ count: count() }).from(mangas).where(where),
    db
      .select({
        id: mangas.id,
        jikanId: mangas.jikanId,
        title: mangas.title,
        synopsis: mangas.synopsis,
        genres: mangas.genres,
        imageUrl: mangas.imageUrl,
        score: mangas.score,
        popularity: mangas.popularity,
      })
      .from(mangas)
      .where(where)
      .orderBy(mangas.popularity)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalResult[0].count);
  const totalPages = Math.ceil(total / limit);
  const nextPage = page < totalPages ? page + 1 : null;

  return NextResponse.json({
    data,
    nextPage,
    total,
    page,
    limit,
  });
}
