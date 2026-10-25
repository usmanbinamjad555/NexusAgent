import { Router } from "express";
import type { Request, Response } from "express";
import type { ApiResponse, HealthResponse, ServiceHealth } from "@nexus-agent/types";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response<ApiResponse<HealthResponse>>) => {
  // Check Database connection (SELECT 1)
  let dbHealth: ServiceHealth;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbHealth = {
      status: "up",
      latencyMs: Date.now() - dbStart,
      message: "PostgreSQL query SELECT 1 successful",
    };
  } catch (error) {
    dbHealth = {
      status: "down",
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // Check Redis connection (PING)
  let redisHealth: ServiceHealth;
  try {
    const redisStart = Date.now();
    const pong = await redis.ping();
    redisHealth = {
      status: pong === "PONG" ? "up" : "down",
      latencyMs: Date.now() - redisStart,
      message: pong === "PONG" ? "Redis ping successful" : "Unexpected Redis response",
    };
  } catch (error) {
    redisHealth = {
      status: "down",
      message: error instanceof Error ? error.message : "Redis connection failed",
    };
  }

  const isDbHealthy = dbHealth.status === "up";
  const isRedisHealthy = redisHealth.status === "up";

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (!isDbHealthy && !isRedisHealthy) {
    overallStatus = "unhealthy";
  } else if (!isDbHealthy || !isRedisHealthy) {
    overallStatus = "degraded";
  }

  const healthData: HealthResponse = {
    status: overallStatus,
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    db: isDbHealthy ? "healthy" : "unhealthy",
    redis: isRedisHealthy ? "healthy" : "unhealthy",
    services: {
      database: dbHealth,
      redis: redisHealth,
    },
  };

  const statusCode = overallStatus === "healthy" ? 200 : 503;

  res.status(statusCode).json({
    success: overallStatus === "healthy",
    data: healthData,
    timestamp: new Date().toISOString(),
  });
});
