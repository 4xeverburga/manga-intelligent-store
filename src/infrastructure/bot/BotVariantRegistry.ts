import type { BotVariant, BotToolName } from "@/core/domain/entities";
import type { IBotVariantRegistry } from "@/core/domain/ports";
import { SYSTEM_PROMPT } from "@/infrastructure/ai/prompts";

// ---------------------------------------------------------------------------
// Shared building blocks — mix-and-match across variants
// ---------------------------------------------------------------------------

const ALL_TOOLS: BotToolName[] = [
  "search_manga",
  "get_recommendations",
  "check_volume_availability",
  "add_volume_to_cart",
];

// ---------------------------------------------------------------------------
// Variant definitions
//
// Each entry is a full snapshot of the bot configuration.
// Bump the patch suffix (v0.1 → v0.2) whenever you change **any** component
// so the env value in Vercel stays as an audit trail.
// ---------------------------------------------------------------------------

const VARIANTS: Record<string, BotVariant> = {
  "av0.1": {
    id: "av0.1",
    modelId: "gemini-2.0-flash",
    temperature: undefined,
    maxSteps: 3,
    enabledTools: ALL_TOOLS,
    systemPrompt: SYSTEM_PROMPT,
  },

  "av0.2": {
    id: "av0.2",
    modelId: "gemini-2.0-flash-lite",
    temperature: undefined,
    maxSteps: 3,
    enabledTools: ALL_TOOLS,
    systemPrompt: SYSTEM_PROMPT,
  },

  "bv0.1": {
    id: "bv0.1",
    modelId: "gemini-2.5-flash",
    temperature: undefined,
    maxSteps: 3,
    enabledTools: ALL_TOOLS,
    systemPrompt: SYSTEM_PROMPT,
  },

  "bv0.2": {
    id: "bv0.2",
    modelId: "gemini-2.5-flash-lite-preview",
    temperature: undefined,
    maxSteps: 3,
    enabledTools: ALL_TOOLS,
    systemPrompt: SYSTEM_PROMPT,
  },
};

const DEFAULT_VARIANT_ID = "av0.1";

// ---------------------------------------------------------------------------
// Registry adapter
// ---------------------------------------------------------------------------

export class BotVariantRegistry implements IBotVariantRegistry {
  resolve(variantId: string): BotVariant {
    const variant = VARIANTS[variantId];
    if (!variant) {
      console.warn(
        `[BotVariantRegistry] Unknown variant "${variantId}", falling back to "${DEFAULT_VARIANT_ID}"`
      );
      return VARIANTS[DEFAULT_VARIANT_ID];
    }
    return variant;
  }
}
