import { streamText, tool, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import { mangas } from "@/infrastructure/db/schema";
import { eq, sql } from "drizzle-orm";
import { GeminiAdapter } from "@/infrastructure/ai/GeminiAdapter";
import { SYSTEM_PROMPT } from "@/infrastructure/ai/prompts";

const ai = new GeminiAdapter();

export async function POST(req: Request) {
  const { messages, profileContext } = await req.json();

  let system = SYSTEM_PROMPT;
  if (profileContext) {
    system += `\n\n## Perfil del usuario
- Username: ${profileContext.username} (${profileContext.platform === "mal" ? "MyAnimeList" : "Reddit"})
- Intereses: ${(profileContext.interestTags ?? []).join(", ") || "No disponible"}
- Géneros favoritos: ${(profileContext.favoriteGenres ?? []).join(", ") || "No disponible"}

Usa esta información para personalizar tus recomendaciones. Puedes referirte a sus gustos de forma natural.`;
  }

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system,
    messages,
    tools: {
      search_manga: tool({
        description:
          "Busca mangas similares en la base de datos usando búsqueda semántica. Úsala SIEMPRE antes de recomendar.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Descripción, título o géneros del manga que busca el usuario"
            ),
        }),
        execute: async ({ query }) => {
          const { embedding } = await ai.generateEmbedding(query);
          const vecStr = "[" + embedding.join(",") + "]";
          const results = await db.execute(
            sql`SELECT * FROM match_mangas(${vecStr}::vector(3072), 0.35, 8)`
          );
          return (results as unknown as Array<Record<string, unknown>>).map(
            (r) => ({
              id: r.id,
              title: r.title,
              synopsis:
                typeof r.synopsis === "string"
                  ? r.synopsis.slice(0, 200)
                  : "",
              genres: r.genres,
              score: r.score,
              imageUrl: r.image_url,
              similarity: r.similarity,
            })
          );
        },
      }),

      add_to_cart: tool({
        description:
          "Agrega un manga al carrito del usuario. Solo úsala cuando el usuario confirme que quiere agregarlo.",
        inputSchema: z.object({
          mangaId: z.string().describe("El ID del manga a agregar"),
          title: z.string().describe("El título del manga"),
          reason: z
            .string()
            .optional()
            .describe("Razón breve de por qué se recomienda"),
        }),
        execute: async ({ mangaId, title, reason }) => {
          // Verify manga exists in DB
          const [manga] = await db
            .select({ id: mangas.id, title: mangas.title })
            .from(mangas)
            .where(eq(mangas.id, mangaId))
            .limit(1);

          if (!manga) {
            return { success: false, error: "Manga not found in database" };
          }

          return {
            success: true,
            mangaId,
            title,
            reason,
            source: "ai-suggested" as const,
          };
        },
      }),

      get_recommendations: tool({
        description:
          "Obtiene recomendaciones personalizadas basadas en géneros, mood o un manga similar.",
        inputSchema: z.object({
          genres: z
            .array(z.string())
            .optional()
            .describe("Lista de géneros deseados"),
          mood: z
            .string()
            .optional()
            .describe("Estado de ánimo o tipo de historia deseada"),
          similarTo: z
            .string()
            .optional()
            .describe("Nombre de un manga para buscar similares"),
        }),
        execute: async ({ genres, mood, similarTo }) => {
          const parts: string[] = [];
          if (genres?.length) parts.push(`Genres: ${genres.join(", ")}`);
          if (mood) parts.push(`Mood: ${mood}`);
          if (similarTo) parts.push(`Similar to: ${similarTo}`);
          const query = parts.join(". ") || "popular manga recommendations";

          const { embedding } = await ai.generateEmbedding(query);
          const vecStr = "[" + embedding.join(",") + "]";
          const results = await db.execute(
            sql`SELECT * FROM match_mangas(${vecStr}::vector(3072), 0.3, 6)`
          );
          return (results as unknown as Array<Record<string, unknown>>).map(
            (r) => ({
              id: r.id,
              title: r.title,
              synopsis:
                typeof r.synopsis === "string"
                  ? r.synopsis.slice(0, 200)
                  : "",
              genres: r.genres,
              score: r.score,
              imageUrl: r.image_url,
              similarity: r.similarity,
            })
          );
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
