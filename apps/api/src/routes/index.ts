import { Router } from "express";
import { healthRouter } from "@/routes/health";
import { agentsRouter } from "@/routes/agents";
import { runsRouter } from "@/routes/runs";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/agents", agentsRouter);
apiRouter.use("/runs", runsRouter);
