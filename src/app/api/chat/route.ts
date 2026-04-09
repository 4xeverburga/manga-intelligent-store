import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { SupabaseMangaRepository } from "@/infrastructure/db/DrizzleMangaRepository";
import { GeminiAdapter } from "@/infrastructure/ai/GeminiAdapter";
import { SemanticSearchMangas } from "@/core/application/use-cases/SemanticSearchMangas";
import { buildSystemPrompt } from "./buildSystemPrompt";
import { searchMangaTool } from "./tools/searchManga";
import { getRecommendationsTool } from "./tools/getRecommendations";
import { checkVolumeAvailabilityTool } from "./tools/checkVolumeAvailability";
import { addVolumeToCartTool } from "./tools/addVolumeToCart";

// Shared instances (module-level — constructed once per cold start)
const mangaRepo = new SupabaseMangaRepository();
const ai = new GeminiAdapter();
const semanticSearch = new SemanticSearchMangas(mangaRepo, ai);

export async function POST(req: Request) {
  const { messages: uiMessages, profileContext } = await req.json();
  const allMessages = await convertToModelMessages(uiMessages);

  // Trim history to avoid exceeding the model's context window
  const maxCtx = Number(process.env.CHAT_MAX_CONTEXT_MESSAGES) || 30;
  const messages =
    allMessages.length > maxCtx ? allMessages.slice(-maxCtx) : allMessages;

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
    system: buildSystemPrompt(profileContext),
    messages,
    tools: {
      search_manga: searchMangaTool(semanticSearch),
      get_recommendations: getRecommendationsTool(semanticSearch),
      check_volume_availability: checkVolumeAvailabilityTool(),
      add_volume_to_cart: addVolumeToCartTool(),
    },
    // Allow up to 3 agentic steps (tool call → response → tool call → …)
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
