import type { Manga } from "@/core/domain/entities/Manga";
import type { IMangaRepository } from "@/core/domain/ports/IMangaRepository";

interface Input {
  page: number;
  limit: number;
  genres?: string[];
  search?: string;
}

interface Output {
  data: Manga[];
  nextPage: number | null;
  total: number;
  page: number;
  limit: number;
}

export class SearchMangas {
  constructor(private mangaRepo: IMangaRepository) {}

  async execute(input: Input): Promise<Output> {
    const page = Math.max(1, input.page);
    const limit = Math.min(48, Math.max(1, input.limit));

    const { data, total } = await this.mangaRepo.searchPaginated({
      page,
      limit,
      genres: input.genres,
      search: input.search,
    });

    const totalPages = Math.ceil(total / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    return { data, nextPage, total, page, limit };
  }
}
