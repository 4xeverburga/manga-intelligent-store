import type { Manga } from "../entities/Manga";

export interface IMangaRepository {
  findById(id: string): Promise<Manga | null>;
  findByJikanId(jikanId: number): Promise<Manga | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<Manga[]>;
  findByGenres(genres: string[]): Promise<Manga[]>;
  searchByText(query: string): Promise<Manga[]>;
  findSimilar(embedding: number[], limit?: number): Promise<Manga[]>;
  upsertFromSeed(
    manga: Omit<Manga, "id" | "createdAt" | "updatedAt">
  ): Promise<Manga>;
  count(): Promise<number>;
}
