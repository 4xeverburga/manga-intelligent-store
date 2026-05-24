import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { SYSTEM_PROMPT } from "@/infrastructure/ai/prompts";
import { SupabaseMangaRepository } from "@/infrastructure/db/SupabaseMangaRepository";
import { GeminiAdapter } from "@/infrastructure/ai/GeminiAdapter";
import { SemanticSearchMangas } from "@/core/application/use-cases/SemanticSearchMangas";
import { searchMangaTool } from "@/app/api/chat/tools/searchManga";
import { getRecommendationsTool } from "@/app/api/chat/tools/getRecommendations";
import { checkVolumeAvailabilityTool } from "@/app/api/chat/tools/checkVolumeAvailability";
import { addVolumeToCartTool } from "@/app/api/chat/tools/addVolumeToCart";
import type { EvalScenario, ScenarioResult, StepResult } from "./types";

export const MODEL_ID = "gemini-3.1-flash-lite-preview";
export const MAX_STEPS = 5;

export function buildTools() {
  const mangaRepo = new SupabaseMangaRepository();
  const ai = new GeminiAdapter();
  const semanticSearch = new SemanticSearchMangas(mangaRepo, ai);
  return {
    search_manga: searchMangaTool(semanticSearch),
    get_recommendations: getRecommendationsTool(semanticSearch),
    check_volume_availability: checkVolumeAvailabilityTool(),
    add_volume_to_cart: addVolumeToCartTool(),
  };
}

export async function runScenario(
  scenario: EvalScenario,
  tools: ReturnType<typeof buildTools>
): Promise<ScenarioResult> {
  const steps: StepResult[] = [];

  const result = await generateText({
    model: google(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages: scenario.messages,
    tools,
    maxSteps: MAX_STEPS,
    onStepFinish: ({ toolCalls, toolResults, text, stepNumber }) => {
      const step: StepResult = { stepNumber };
      if (toolCalls?.length) {
        step.toolCalls = toolCalls.map((tc) => ({
          toolName: tc.toolName,
          input: "input" in tc ? tc.input : tc.args,
        }));
      }
      if (toolResults?.length) {
        step.toolResults = toolResults.map((tr) => ({
          toolName: tr.toolName,
          output: tr.result ?? tr.output ?? null,
        }));
      }
      if (text) step.text = text;
      steps.push(step);
    },
  });

  return {
    id: scenario.id,
    description: scenario.description,
    modelId: MODEL_ID,
    timestamp: new Date().toISOString(),
    messages: scenario.messages,
    steps,
    finalText: result.text,
  };
}

export function writeResults(toolName: string, results: ScenarioResult[]): void {
  const dir = join(process.cwd(), "out", "eval", toolName);
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().slice(0, 19).replace(":", "-").replace(":", "-");
  const outputPath = join(dir, `${ts}.json`);
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Eval results written to: ${outputPath}\n`);
}
