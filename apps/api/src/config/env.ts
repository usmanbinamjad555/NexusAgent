import { config } from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1, { message: "DATABASE_URL is required" })
    .default(
      "postgresql://nexus_user:nexus_secret_password@localhost:5432/nexus_agent?schema=public",
    ),
  REDIS_URL: z
    .string()
    .min(1, { message: "REDIS_URL is required" })
    .default("redis://localhost:6379"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ [Config Error] Invalid environment variables:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export type Env = z.infer<typeof envSchema>;
export const env: Env = parsedEnv.data;
