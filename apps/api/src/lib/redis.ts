import Redis from "ioredis";
import { env } from "@/config/env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("error", (err: unknown) => {
  console.error("⚠️ [Redis Error]", err instanceof Error ? err.message : String(err));
});

const handleRedisShutdown = async () => {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
};

process.on("beforeExit", handleRedisShutdown);

