import type { MangaWithSimilarity } from "@/core/domain/entities/Manga";
import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";
import { validateEnv } from "@/infrastructure/config/env";

export class FindSimilarMangas {
  constructor(private mangaRepo: IMangaRepository) {}

  async execute(mangaId: string): Promise<MangaWithSimilarity[]> {
    const env = validateEnv();
    const manga = await this.mangaRepo.findById(mangaId);
    if (!manga) throw new Error("Manga not found");
    if (!manga.embedding) throw new Error("Manga has no embedding");

    const results = await this.mangaRepo.findSimilar(manga.embedding, {
      limit: env.SIMILAR_MANGAS_LIMIT + 1,
      threshold: env.SIMILAR_MANGAS_THRESHOLD,
    });

    return results.filter((r) => r.id !== mangaId).slice(0, env.SIMILAR_MANGAS_LIMIT);
  }
}
