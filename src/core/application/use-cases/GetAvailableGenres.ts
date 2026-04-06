import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";

export class GetAvailableGenres {
  constructor(private mangaRepo: IMangaRepository) {}

  async execute(): Promise<string[]> {
    return this.mangaRepo.getDistinctGenres();
  }
}
