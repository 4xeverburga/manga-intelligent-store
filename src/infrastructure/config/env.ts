import { z } from "zod";

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
  // Free-form string — validated against the registry at runtime, not here.
  // Edit variants in: src/infrastructure/bot/BotVariantRegistry.ts
  CHAT_BOT_VARIANT: z.string().optional().default("av0.1"),
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
