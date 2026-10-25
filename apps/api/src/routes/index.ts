import { Router } from "express";
import { healthRouter } from "@/routes/health";
import { agentsRouter } from "@/routes/agents";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/agents", agentsRouter);
