import { NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  const result = await db.execute<{ genre: string }>(
    sql`SELECT DISTINCT unnest(genres) AS genre FROM mangas ORDER BY genre`
  );

  const genres = (result as unknown as Array<{ genre: string }>).map(
    (r) => r.genre
  );

  return NextResponse.json(genres);
}
