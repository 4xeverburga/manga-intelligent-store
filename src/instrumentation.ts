export async function register() {
  if (process.env.NODE_ENV === "production") {
    const { validateEnv } = await import("@/infrastructure/config/env");
    validateEnv();
  }
}
