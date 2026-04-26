export type BotToolName =
  | "search_manga"
  | "get_recommendations"
  | "check_volume_availability"
  | "add_volume_to_cart";

export interface BotVariant {
  /** Human-readable variant ID, e.g. "av0.1", "bv0.1". */
  id: string;

  /** Concrete Gemini model ID, e.g. "gemini-2.0-flash". */
  modelId: string;

  /** Generation temperature (0–2). undefined = model default. */
  temperature?: number;

  /** Maximum agentic steps (tool-call rounds). */
  maxSteps: number;

  /** Which tools this variant enables. */
  enabledTools: BotToolName[];

  /** Base system prompt injected before profile context. */
  systemPrompt: string;
}
