import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "@/config/env";
import { apiRouter } from "@/routes/index";
import { errorHandler, AppError } from "@/middlewares/errorHandler";
import { requestLogger } from "@/middlewares/requestLogger";

export const createServer = (): express.Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Request body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Logging
  app.use(requestLogger);

  // Root healthcheck alias
  app.get("/health", (_req, res) => {
    res.redirect("/api/health");
  });

  // API routes
  app.use("/api", apiRouter);

  // Catch-all 404 handler
  app.use((req, _res, next) => {
    next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};
