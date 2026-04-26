import { z } from "zod";

/**
 * Bot variants encapsulate the full bot configuration (model, prompt, tools,
 * temperature, maxSteps). CHAT_BOT_VARIANT selects which variant is active.
 *
 * Naming convention: <slot><semver-patch>
 *   av0.1  → first "a-slot" candidate (baseline)
 *   bv0.1  → first "b-slot" candidate (challenger)
 *   av0.2  → updated baseline after any change to model/prompt/tools, etc.
 *
 * See src/infrastructure/bot/BotVariantRegistry.ts for variant definitions.
 */
const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NIUBIZ_MERCHANT_ID: z.string().min(1),
  NIUBIZ_API_USERNAME: z.string().min(1),
  NIUBIZ_API_PASS: z.string().min(1),
  NIUBIZ_SECURITY_URL: z.string().url(),
  NIUBIZ_SESSION_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // Active bot variant — selects model + prompt + tools + temperature.
  CHAT_BOT_VARIANT: z
    .enum(["av0.1", "av0.2", "bv0.1", "bv0.2"])
    .optional()
    .default("av0.1"),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `\n❌ Missing or invalid environment variables:\n${missing}\n`
    );
    throw new Error("Environment validation failed");
  }
  return result.data;
}
