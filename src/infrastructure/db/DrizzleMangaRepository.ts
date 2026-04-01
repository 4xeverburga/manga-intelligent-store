import type { Manga } from "@/core/domain/entities/Manga";
import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";
import { supabase } from "./client";

interface MangaRow {
  id: string;
  jikan_id: number;
  title: string;
  synopsis: string;
  genres: string[];
  image_url: string;
  score: number | null;
  popularity: number | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseMangaRepository implements IMangaRepository {
  async findById(id: string): Promise<Manga | null> {
    const { data } = await supabase
      .from("mangas")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    return data ? this.toDomain(data as MangaRow) : null;
  }

  async findByJikanId(jikanId: number): Promise<Manga | null> {
    const { data } = await supabase
      .from("mangas")
      .select("*")
      .eq("jikan_id", jikanId)
      .limit(1)
      .single();
    return data ? this.toDomain(data as MangaRow) : null;
  }

  async findAll(
    options: { limit?: number; offset?: number } = {}
  ): Promise<Manga[]> {
    const { limit = 24, offset = 0 } = options;
    const { data } = await supabase
      .from("mangas")
      .select("*")
      .order("popularity", { ascending: true })
      .range(offset, offset + limit - 1);
    return (data ?? []).map((r) => this.toDomain(r as MangaRow));
  }

  async findByGenres(genres: string[]): Promise<Manga[]> {
    const { data } = await supabase
      .from("mangas")
      .select("*")
      .overlaps("genres", genres);
    return (data ?? []).map((r) => this.toDomain(r as MangaRow));
  }

  async searchByText(query: string): Promise<Manga[]> {
    const { data } = await supabase
      .from("mangas")
      .select("*")
      .ilike("title", `%${query}%`)
      .limit(20);
    return (data ?? []).map((r) => this.toDomain(r as MangaRow));
  }

  async findSimilar(
    embedding: number[],
    limit: number = 10
  ): Promise<Manga[]> {
    const { data } = await supabase.rpc("match_mangas", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.3,
      match_count: limit,
    });
    return ((data ?? []) as Array<MangaRow & { similarity: number }>).map(
      (row) => ({
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
      })
    );
  }

  async upsertFromSeed(
    manga: Omit<Manga, "id" | "createdAt" | "updatedAt">
  ): Promise<Manga> {
    const { data, error } = await supabase
      .from("mangas")
      .upsert(
        {
          jikan_id: manga.jikanId,
          title: manga.title,
          synopsis: manga.synopsis,
          genres: manga.genres,
          image_url: manga.imageUrl,
          score: manga.score,
          popularity: manga.popularity,
          embedding: JSON.stringify(manga.embedding),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "jikan_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data as MangaRow);
  }

  async count(): Promise<number> {
    const { count } = await supabase
      .from("mangas")
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  }

  private toDomain(row: MangaRow): Manga {
    return {
      id: row.id,
      jikanId: row.jikan_id,
      title: row.title,
      synopsis: row.synopsis,
      genres: row.genres,
      imageUrl: row.image_url,
      score: row.score ?? 0,
      popularity: row.popularity ?? 0,
      embedding: row.embedding ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
