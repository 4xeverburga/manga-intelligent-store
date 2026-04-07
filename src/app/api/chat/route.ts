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
          if (rd.mangaList && (rd.mangaList as string[]).length > 0)
            section += `\n- Lista de manga: ${(rd.mangaList as string[]).join(", ")}`;
          if (rd.animeList && (rd.animeList as string[]).length > 0)
            section += `\n- Lista de anime: ${(rd.animeList as string[]).join(", ")}`;
          // Legacy fields (in case of cached profiles)
          if (rd.readingManga && (rd.readingManga as string[]).length > 0)
            section += `\n- Leyendo ahora: ${(rd.readingManga as string[]).join(", ")}`;
          if (rd.watchingAnime && (rd.watchingAnime as string[]).length > 0)
            section += `\n- Viendo ahora: ${(rd.watchingAnime as string[]).join(", ")}`;
          if (rd.stats) {
            const s = rd.stats as Record<string, Record<string, number>>;
            if (s.anime?.total_entries > 0)
              section += `\n- Estadísticas anime: ${s.anime.total_entries} títulos, score promedio ${s.anime.mean_score}`;
            if (s.manga?.total_entries > 0)
              section += `\n- Estadísticas manga: ${s.manga.total_entries} títulos, score promedio ${s.manga.mean_score}`;
          }
          if (rd.listsPrivate)
            section += `\n- ⚠️ Listas configuradas como privadas en MAL (datos limitados)`;
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
    const tags = (profileContext.interestTags ?? []).join(", ");
    const genres = (profileContext.favoriteGenres ?? []).join(", ");

    system += `\n\n## Perfil del usuario\n${platformSections.join("\n\n")}`;

    system += `\n\n### Resumen general`;
    if (tags || genres) {
      if (tags) system += `\n- Intereses IA: ${tags}`;
      if (genres) system += `\n- Géneros favoritos: ${genres}`;
    } else {
      system += `\n- No se pudo extraer preferencias en base a los datos de los perfiles. Basa tus recomendaciones en lo que el usuario te pida durante la conversación.`;
    }

    system += `\n\nIMPORTANTE: Ya tienes los datos del usuario. NO le preguntes qué géneros le gustan ni cuál es su manga favorito — ya lo sabes por sus perfiles. Usa esta información directamente para personalizar recomendaciones. Cuando el usuario pregunte qué sabes de su perfil, responde con datos CONCRETOS: títulos específicos, subreddits, animes, etc. Si un campo dice "No disponible", no lo menciones.`;
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
