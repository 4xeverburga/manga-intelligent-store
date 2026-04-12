import { tool } from "ai";
import { z } from "zod";
import type { SemanticSearchMangas } from "@/core/application/use-cases/SemanticSearchMangas";

/**
 * search_manga
 *
 * Semantic search over the catalogue. The AI should call this before making
 * any recommendation so it only references titles that actually exist in the
 * store.
 */
export function searchMangaTool(semanticSearch: SemanticSearchMangas) {
  return tool({
    description:
      "Busca mangas similares en la base de datos usando búsqueda semántica. Úsala SIEMPRE antes de recomendar.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Descripción, título o géneros del manga que busca el usuario"),
    }),
    execute: async ({ query }) => {
      const results = await semanticSearch.execute({
        query,
        threshold: 0.35,
        limit: 8,
      });
      return results.map((r) => ({
        id: r.id,
        title: r.title,
        synopsis: r.synopsis.slice(0, 200),
        genres: r.genres,
        score: r.score,
        imageUrl: r.imageUrl,
        similarity: r.similarity,
      }));
    },
  });
}
