import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import type { BotToolName } from "@/core/domain/entities";
import { SupabaseMangaRepository } from "@/infrastructure/db/SupabaseMangaRepository";
import { GeminiAdapter } from "@/infrastructure/ai/GeminiAdapter";
import { BotVariantRegistry } from "@/infrastructure/bot/BotVariantRegistry";
import { SemanticSearchMangas } from "@/core/application/use-cases/SemanticSearchMangas";
import { buildSystemPrompt } from "./buildSystemPrompt";
import { searchMangaTool } from "./tools/searchManga";
import { getRecommendationsTool } from "./tools/getRecommendations";
import { checkVolumeAvailabilityTool } from "./tools/checkVolumeAvailability";
import { addVolumeToCartTool } from "./tools/addVolumeToCart";

const isDev = process.env.NEXT_PUBLIC_APP_ENVIRONMENT === "DEV";

// ---------------------------------------------------------------------------
// Module-level singletons (constructed once per cold start)
// ---------------------------------------------------------------------------
const mangaRepo = new SupabaseMangaRepository();
const ai = new GeminiAdapter();
const semanticSearch = new SemanticSearchMangas(mangaRepo, ai);
const variantRegistry = new BotVariantRegistry();

// ---------------------------------------------------------------------------
// Tool catalogue — every tool the bot *can* use.
// The active variant decides which subset is enabled per request.
// ---------------------------------------------------------------------------
type ToolEntry = ReturnType<
  | typeof searchMangaTool
  | typeof getRecommendationsTool
  | typeof checkVolumeAvailabilityTool
  | typeof addVolumeToCartTool
>;

function buildToolCatalogue(): Record<BotToolName, ToolEntry> {
  return {
    search_manga: searchMangaTool(semanticSearch),
    get_recommendations: getRecommendationsTool(semanticSearch),
    check_volume_availability: checkVolumeAvailabilityTool(),
    add_volume_to_cart: addVolumeToCartTool(),
  };
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const { messages: uiMessages, profileContext } = await req.json();
  const allMessages = await convertToModelMessages(uiMessages);

  const maxCtx = Number(process.env.CHAT_MAX_CONTEXT_MESSAGES) || 30;
  const messages =
    allMessages.length > maxCtx ? allMessages.slice(-maxCtx) : allMessages;

  // --- Resolve the active bot variant ---
  const variantId = process.env.CHAT_BOT_VARIANT ?? "av0.1";
  const variant = variantRegistry.resolve(variantId);

  // Build the tool set from the variant's enabledTools list
  const catalogue = buildToolCatalogue();
  const tools = Object.fromEntries(
    variant.enabledTools.map((name) => [name, catalogue[name]]),
  ) as Record<string, ToolEntry>;

  const result = streamText({
    model: google(variant.modelId),
    system: buildSystemPrompt(variant.systemPrompt, profileContext),
    messages,
    ...(variant.temperature !== undefined && { temperature: variant.temperature }),
    tools,
    stopWhen: stepCountIs(variant.maxSteps),
    onStepFinish: isDev
      ? ({ toolCalls, toolResults, text, stepNumber }) => {
          if (toolCalls?.length) {
            console.log(
              `[chat] step=${stepNumber} variant=${variant.id} model=${variant.modelId} tools=${toolCalls.map((t) => t.toolName).join(", ")}`,
            );
            for (const tc of toolCalls) {
              console.log(`  → ${tc.toolName}`, JSON.stringify(tc.input));
            }
          }
          if (toolResults?.length) {
            for (const tr of toolResults) {
              console.log(
                `  ← ${tr.toolName}`,
                JSON.stringify(tr.output).slice(0, 300),
              );
            }
          }
          if (text) {
            console.log(`[chat] text (${text.length} chars)`);
          }
        }
      : undefined,
  });

  return result.toUIMessageStreamResponse({
    onError: (error: unknown) => {
      const statusCode =
        error != null &&
        typeof error === "object" &&
        "statusCode" in error
          ? (error as { statusCode: number }).statusCode
          : undefined;

      if (statusCode === 503) {
        return "El modelo en uso se encuentra bajo alta demanda. Por favor, inténtalo de nuevo en unos segundos.";
      }

      return "Ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo.";
    },
  });
}
