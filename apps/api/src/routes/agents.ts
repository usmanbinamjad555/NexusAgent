import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import type { Agent, ApiResponse, CreateAgentInput } from "@nexus-agent/types";
import { validateRequest } from "@/middlewares/validateRequest";
import { AppError } from "@/middlewares/errorHandler";

export const agentsRouter = Router();

// In-memory mock store for initial scaffolding
const agentsStore: Agent[] = [
  {
    id: "agent-core-01",
    name: "Nexus Core Planner",
    status: "running",
    config: {
      name: "Nexus Core Planner",
      description: "Autonomous goal orchestration and task decomposition engine",
      model: "gemini-2.0-flash",
      capabilities: ["task_planning", "code_execution"],
      temperature: 0.2,
      maxTokens: 4096,
      systemPrompt: "You are an autonomous orchestrator.",
    },
    activeTasks: 2,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-data-02",
    name: "Data Pipeline Specialist",
    status: "idle",
    config: {
      name: "Data Pipeline Specialist",
      description: "Executes ETL transformations and real-time data sync",
      model: "gemini-2.0-flash",
      capabilities: ["data_analysis", "web_search"],
      temperature: 0.1,
      maxTokens: 2048,
    },
    activeTasks: 0,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const createAgentSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().min(5).max(256),
  model: z.string().min(1),
  capabilities: z.array(
    z.enum(["code_execution", "web_search", "data_analysis", "file_management", "task_planning"]),
  ),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().positive().optional().default(2048),
  systemPrompt: z.string().optional(),
});

// GET /api/agents
agentsRouter.get("/", (_req: Request, res: Response<ApiResponse<Agent[]>>) => {
  res.status(200).json({
    success: true,
    data: agentsStore,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/agents/:id
agentsRouter.get("/:id", (req: Request, res: Response<ApiResponse<Agent>>) => {
  const agent = agentsStore.find((a) => a.id === req.params.id);
  if (!agent) {
    throw new AppError(`Agent with ID '${req.params.id}' not found`, 404, "AGENT_NOT_FOUND");
  }

  res.status(200).json({
    success: true,
    data: agent,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/agents
agentsRouter.post(
  "/",
  validateRequest({ body: createAgentSchema }),
  (req: Request, res: Response<ApiResponse<Agent>>) => {
    const input = req.body as CreateAgentInput;
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: input.name,
      status: "idle",
      config: {
        name: input.name,
        description: input.description,
        model: input.model,
        capabilities: input.capabilities,
        temperature: input.temperature ?? 0.7,
        maxTokens: input.maxTokens ?? 2048,
        systemPrompt: input.systemPrompt,
      },
      activeTasks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    agentsStore.push(newAgent);

    res.status(201).json({
      success: true,
      data: newAgent,
      timestamp: new Date().toISOString(),
    });
  },
);
