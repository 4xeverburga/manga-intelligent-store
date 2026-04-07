import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { SupabaseMangaRepository } from "@/infrastructure/db/DrizzleMangaRepository";
import { GeminiAdapter } from "@/infrastructure/ai/GeminiAdapter";
import { SemanticSearchMangas } from "@/core/application/use-cases/SemanticSearchMangas";
import { SYSTEM_PROMPT } from "@/infrastructure/ai/prompts";

const mangaRepo = new SupabaseMangaRepository();
const ai = new GeminiAdapter();
const semanticSearch = new SemanticSearchMangas(mangaRepo, ai);

export async function POST(req: Request) {
  const { messages: uiMessages, profileContext } = await req.json();
  const allMessages = await convertToModelMessages(uiMessages);

  // Keep only the last N model messages to stay within context limits
  const maxCtx = Number(process.env.CHAT_MAX_CONTEXT_MESSAGES) || 30;
  const messages = allMessages.length > maxCtx
    ? allMessages.slice(-maxCtx)
    : allMessages;

  let system = SYSTEM_PROMPT;
  if (profileContext) {
    const platformSections = (profileContext.platforms ?? []).map(
      (p: { username: string; platform: string; rawData?: Record<string, unknown> }) => {
        const label = p.platform === "mal" ? "MyAnimeList" : "Reddit";
        let section = `### ${p.username} (${label})`;
        if (p.rawData) {
          const rd = p.rawData;
          if (rd.favoriteManga && (rd.favoriteManga as string[]).length > 0)
            section += `\n- Manga favoritos: ${(rd.favoriteManga as string[]).join(", ")}`;
          if (rd.favoriteAnime && (rd.favoriteAnime as string[]).length > 0)
            section += `\n- Anime favoritos: ${(rd.favoriteAnime as string[]).join(", ")}`;
          if (rd.readingManga && (rd.readingManga as string[]).length > 0)
            section += `\n- Leyendo ahora: ${(rd.readingManga as string[]).join(", ")}`;
          if (rd.watchingAnime && (rd.watchingAnime as string[]).length > 0)
            section += `\n- Viendo ahora: ${(rd.watchingAnime as string[]).join(", ")}`;
          if (rd.subreddits && (rd.subreddits as string[]).length > 0)
            section += `\n- Subreddits activos: ${(rd.subreddits as string[]).join(", ")}`;
          if (rd.mangaSubreddits && (rd.mangaSubreddits as string[]).length > 0)
            section += `\n- Subreddits manga/anime: ${(rd.mangaSubreddits as string[]).join(", ")}`;
          if (rd.mangaPostTitles && (rd.mangaPostTitles as string[]).length > 0)
            section += `\n- Posts recientes sobre manga: ${(rd.mangaPostTitles as string[]).join("; ")}`;
        }
        return section;
      }
    );
    system += `\n\n## Perfil del usuario\n${platformSections.join("\n\n")}
- Intereses IA: ${(profileContext.interestTags ?? []).join(", ") || "No disponible"}
- G\u00e9neros favoritos: ${(profileContext.favoriteGenres ?? []).join(", ") || "No disponible"}

IMPORTANTE: Ya tienes los datos del usuario. NO le preguntes qu\u00e9 g\u00e9neros le gustan ni cu\u00e1l es su manga favorito — ya lo sabes por sus perfiles. Usa esta informaci\u00f3n directamente para personalizar recomendaciones. Cuando el usuario pregunte qu\u00e9 sabes de su perfil, responde con datos CONCRETOS: t\u00edtulos espec\u00edficos, subreddits, animes, etc.`;
  }

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
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
          const manga = await mangaRepo.findById(mangaId);
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
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
