import { eq, ilike, or, sql } from "drizzle-orm";
import type { Manga } from "@/core/domain/entities/Manga";
import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";
import { db } from "./client";
import { mangas } from "./schema";

export class DrizzleMangaRepository implements IMangaRepository {
  async findById(id: string): Promise<Manga | null> {
    const result = await db
      .select()
      .from(mangas)
      .where(eq(mangas.id, id))
      .limit(1);
    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByJikanId(jikanId: number): Promise<Manga | null> {
    const result = await db
      .select()
      .from(mangas)
      .where(eq(mangas.jikanId, jikanId))
      .limit(1);
    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findAll(
    options: { limit?: number; offset?: number } = {}
  ): Promise<Manga[]> {
    const { limit = 24, offset = 0 } = options;
    const result = await db
      .select()
      .from(mangas)
      .limit(limit)
      .offset(offset)
      .orderBy(mangas.popularity);
    return result.map(this.toDomain);
  }

  async findByGenres(genres: string[]): Promise<Manga[]> {
    const result = await db
      .select()
      .from(mangas)
      .where(sql`${mangas.genres} && ${genres}`);
    return result.map(this.toDomain);
  }

  async searchByText(query: string): Promise<Manga[]> {
    const pattern = `%${query}%`;
    const result = await db
      .select()
      .from(mangas)
      .where(
        or(
          ilike(mangas.title, pattern),
          ilike(mangas.synopsis, pattern)
        )
      )
      .limit(20);
    return result.map(this.toDomain);
  }

  async findSimilar(
    embedding: number[],
    limit: number = 10
  ): Promise<Manga[]> {
    const vectorStr = `[${embedding.join(",")}]`;
    const result = await db.execute<{
      id: string;
      jikan_id: number;
      title: string;
      synopsis: string;
      genres: string[];
      image_url: string;
      score: number;
      popularity: number;
      similarity: number;
    }>(
      sql`SELECT * FROM match_mangas(${vectorStr}::vector(3072), 0.3, ${limit})`
    );
    return (result as unknown as Array<{
      id: string;
      jikan_id: number;
      title: string;
      synopsis: string;
      genres: string[];
      image_url: string;
      score: number;
      popularity: number;
      similarity: number;
    }>).map((row) => ({
      id: row.id,
      jikanId: row.jikan_id,
      title: row.title,
      synopsis: row.synopsis,
      genres: row.genres,
      imageUrl: row.image_url,
      score: row.score ?? 0,
      popularity: row.popularity ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async upsertFromSeed(
    manga: Omit<Manga, "id" | "createdAt" | "updatedAt">
  ): Promise<Manga> {
    const result = await db
      .insert(mangas)
      .values({
        jikanId: manga.jikanId,
        title: manga.title,
        synopsis: manga.synopsis,
        genres: manga.genres,
        imageUrl: manga.imageUrl,
        score: manga.score,
        popularity: manga.popularity,
        embedding: manga.embedding,
      })
      .onConflictDoUpdate({
        target: mangas.jikanId,
        set: {
          title: manga.title,
          synopsis: manga.synopsis,
          genres: manga.genres,
          imageUrl: manga.imageUrl,
          score: manga.score,
          popularity: manga.popularity,
          embedding: manga.embedding,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.toDomain(result[0]);
  }

  async count(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(mangas);
    return Number(result[0].count);
  }

  private toDomain(row: typeof mangas.$inferSelect): Manga {
    return {
      id: row.id,
      jikanId: row.jikanId,
      title: row.title,
      synopsis: row.synopsis,
      genres: row.genres,
      imageUrl: row.imageUrl,
      score: row.score ?? 0,
      popularity: row.popularity ?? 0,
      embedding: row.embedding ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
