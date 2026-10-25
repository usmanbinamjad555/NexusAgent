import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import type { AgentRun, ApiResponse, CreateRunInput, RunEvent } from "@nexus-agent/types";
import { env } from "@/config/env";
import { validateRequest } from "@/middlewares/validateRequest";
import { AppError } from "@/middlewares/errorHandler";
import { createProvider } from "@/agents/llm";
import { executeRun } from "@/agents/orchestrator";
import { persistRun } from "@/agents/persistence";
import { runStore } from "@/agents/runStore";

export const runsRouter = Router();

const createRunSchema = z.object({
  title: z.string().trim().min(2).max(120),
  requirements: z.string().trim().min(10).max(8000),
});

const ok = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const provider = createProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);

// POST /api/runs: start a multi-agent run in the background
runsRouter.post(
  "/",
  validateRequest({ body: createRunSchema }),
  (req: Request, res: Response<ApiResponse<AgentRun>>) => {
    const run = runStore.create(req.body as CreateRunInput, provider.name);
    void executeRun(run.id, {
      provider,
      store: runStore,
      ...(env.PERSIST_RUNS && { onFinished: persistRun }),
    });
    res.status(202).json(ok(run));
  },
);

// GET /api/runs
runsRouter.get("/", (_req: Request, res: Response<ApiResponse<AgentRun[]>>) => {
  res.json(ok(runStore.list()));
});

// GET /api/runs/:id
runsRouter.get("/:id", (req: Request, res: Response<ApiResponse<AgentRun>>) => {
  const run = runStore.get(req.params["id"] ?? "");
  if (!run) throw new AppError("Run not found", 404, "RUN_NOT_FOUND");
  res.json(ok(run));
});

// GET /api/runs/:id/events: Server-Sent Events stream of agent activity
runsRouter.get("/:id/events", (req: Request, res: Response) => {
  const id = req.params["id"] ?? "";
  if (!runStore.get(id)) throw new AppError("Run not found", 404, "RUN_NOT_FOUND");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const unsubscribe = runStore.subscribe(id, (event: RunEvent) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    if (event.type === "run_completed" || event.type === "run_failed") {
      unsubscribe();
      res.end();
    }
  });
  req.on("close", unsubscribe);
});
