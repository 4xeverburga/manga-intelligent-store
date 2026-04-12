import { tool } from "ai";
import { z } from "zod";
import type { SemanticSearchMangas } from "@/core/application/use-cases/SemanticSearchMangas";

/**
 * get_recommendations
 *
 * Personalised recommendations built from one or more signals: genres, mood,
 * or a seed title. All inputs are optional — the model picks the combination
 * that best matches the user's intent.
 */
export function getRecommendationsTool(semanticSearch: SemanticSearchMangas) {
  return tool({
    description:
      "Obtiene recomendaciones personalizadas basadas en géneros, mood o un manga similar.",
    inputSchema: z.object({
      genres: z.array(z.string()).optional().describe("Lista de géneros deseados"),
      mood: z.string().optional().describe("Estado de ánimo o tipo de historia deseada"),
      similarTo: z.string().optional().describe("Nombre de un manga para buscar similares"),
    }),
    execute: async ({ genres, mood, similarTo }) => {
      // Build a single natural-language query from all provided signals
      const parts: string[] = [];
      if (genres?.length) parts.push(`Genres: ${genres.join(", ")}`);
      if (mood) parts.push(`Mood: ${mood}`);
      if (similarTo) parts.push(`Similar to: ${similarTo}`);
      const query = parts.join(". ") || "popular manga recommendations";

      const results = await semanticSearch.execute({
        query,
        threshold: 0.3,
        limit: 6,
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
