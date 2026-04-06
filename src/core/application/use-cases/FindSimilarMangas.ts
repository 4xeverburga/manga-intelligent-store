import type { MangaWithSimilarity } from "@/core/domain/entities/Manga";
import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";

export class FindSimilarMangas {
  constructor(private mangaRepo: IMangaRepository) {}

  async execute(mangaId: string): Promise<MangaWithSimilarity[]> {
    const manga = await this.mangaRepo.findById(mangaId);
    if (!manga) throw new Error("Manga not found");
    if (!manga.embedding) throw new Error("Manga has no embedding");

    const results = await this.mangaRepo.findSimilar(manga.embedding, {
      limit: 7,
      threshold: 0.3,
    });

    return results.filter((r) => r.id !== mangaId).slice(0, 6);
  }
}
