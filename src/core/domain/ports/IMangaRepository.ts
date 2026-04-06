import type { Manga, MangaWithSimilarity } from "../entities/Manga";

export interface SearchFilters {
  page: number;
  limit: number;
  genres?: string[];
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IMangaRepository {
  findById(id: string): Promise<Manga | null>;
  findByJikanId(jikanId: number): Promise<Manga | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<Manga[]>;
  findByGenres(genres: string[]): Promise<Manga[]>;
  searchByText(query: string): Promise<Manga[]>;
  findSimilar(
    embedding: number[],
    options?: { limit?: number; threshold?: number }
  ): Promise<MangaWithSimilarity[]>;
  searchPaginated(filters: SearchFilters): Promise<PaginatedResult<Manga>>;
  getDistinctGenres(): Promise<string[]>;
  upsertFromSeed(
    manga: Omit<Manga, "id" | "createdAt" | "updatedAt">
  ): Promise<Manga>;
  count(): Promise<number>;
}
