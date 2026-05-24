import type { MangaWithSimilarity } from "@/core/domain/entities/Manga";
import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";
import type { IAIService } from "@/core/domain/ports/IAIService";
import { validateEnv } from "@/infrastructure/config/env";

interface Input {
  query: string;
  threshold?: number;
  limit?: number;
}

export class SemanticSearchMangas {
  constructor(
    private mangaRepo: IMangaRepository,
    private aiService: IAIService
  ) {}

  async execute(input: Input): Promise<MangaWithSimilarity[]> {
    const env = validateEnv();
    const { embedding } = await this.aiService.generateEmbedding(input.query);
    const results = await this.mangaRepo.findSimilar(embedding, {
      limit: input.limit ?? env.SEMANTIC_SEARCH_LIMIT,
      threshold: input.threshold ?? env.SEMANTIC_SEARCH_THRESHOLD,
    });
    return results.sort((a, b) => {
      const normalizedA = Math.min(1, Math.max(0, (a.score - 7) / 3));
      const normalizedB = Math.min(1, Math.max(0, (b.score - 7) / 3));
      const combinedA = a.similarity * 0.6 + normalizedA * 0.4;
      const combinedB = b.similarity * 0.6 + normalizedB * 0.4;
      return combinedB - combinedA;
    });
  }
}
