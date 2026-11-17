import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required").default("dev-secret-change-in-production-min-32-chars"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ENABLE_DEMO_AUTH: z.enum(["true", "false"]).default("true"),
  CRON_SECRET: z.string().default("dev-cron-secret"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
});

export function getEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    // Only throw in production builds; in local dev fallback gracefully with warnings
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration.");
    }
  }
  return result.success ? result.data : (process.env as unknown as z.infer<typeof envSchema>);
}

export const env = getEnv();
