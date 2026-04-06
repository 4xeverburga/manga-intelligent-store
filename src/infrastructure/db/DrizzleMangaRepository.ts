import type { Manga, MangaWithSimilarity } from "@/core/domain/entities/Manga";
import type {
  IMangaRepository,
  SearchFilters,
  PaginatedResult,
} from "@/core/domain/ports/IMangaRepository";
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
    options: { limit?: number; threshold?: number } = {}
  ): Promise<MangaWithSimilarity[]> {
    const { limit = 10, threshold = 0.3 } = options;
    const { data } = await supabase.rpc("match_mangas", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: threshold,
      match_count: limit,
    });
    return ((data ?? []) as Array<MangaRow & { similarity: number }>).map(
      (row) => ({
        ...this.toDomain(row),
        similarity: row.similarity,
      })
    );
  }

  async searchPaginated(
    filters: SearchFilters
  ): Promise<PaginatedResult<Manga>> {
    const { page, limit, genres, search } = filters;
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from("mangas")
      .select("*", { count: "exact", head: true });

    let dataQuery = supabase
      .from("mangas")
      .select(
        "id, jikan_id, title, synopsis, genres, image_url, score, popularity, created_at, updated_at"
      )
      .order("popularity", { ascending: true })
      .range(offset, offset + limit - 1);

    if (genres && genres.length > 0) {
      countQuery = countQuery.contains("genres", genres);
      dataQuery = dataQuery.contains("genres", genres);
    }

    if (search) {
      countQuery = countQuery.ilike("title", `%${search}%`);
      dataQuery = dataQuery.ilike("title", `%${search}%`);
    }

    const [{ count: total }, { data }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    return {
      data: (data ?? []).map((r) => this.toDomain(r as MangaRow)),
      total: total ?? 0,
    };
  }

  async getDistinctGenres(): Promise<string[]> {
    const { data } = await supabase.from("mangas").select("genres");
    const genreSet = new Set<string>();
    (data ?? []).forEach((m) =>
      (m.genres as string[]).forEach((g) => genreSet.add(g))
    );
    return [...genreSet].sort();
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

  private toDomain(row: Partial<MangaRow> & Pick<MangaRow, 'id' | 'jikan_id' | 'title' | 'synopsis' | 'genres' | 'image_url'>): Manga {
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
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }
}
