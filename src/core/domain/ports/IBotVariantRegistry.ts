import type { BotVariant } from "../entities/BotVariant";

export interface IBotVariantRegistry {
  /** Resolve a variant ID to its full configuration. */
  resolve(variantId: string): BotVariant;
}
