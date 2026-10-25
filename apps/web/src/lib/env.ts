import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || "development",
});

if (!parsedEnv.success) {
  console.error("❌ [Web Config Error] Invalid environment variables:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error("Invalid environment variables in apps/web");
}

export type WebEnv = z.infer<typeof envSchema>;
export const env: WebEnv = parsedEnv.data;
