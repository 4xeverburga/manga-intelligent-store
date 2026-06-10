export async function register() {
  if (process.env.NODE_ENV === "production") {
    await import("@/infrastructure/config/env"); // triggers validateEnv() at startup
  }
}
