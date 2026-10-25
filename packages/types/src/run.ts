export type SpecialistType = "PM" | "SECURITY" | "DATABASE" | "DEVOPS" | "COST";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AgentOutput {
  agent: SpecialistType;
  summary: string;
  sections: Array<{ heading: string; items: string[] }>;
  steps: number;
  usage: TokenUsage;
  revision: number;
}

export interface ReviewIssue {
  agent: SpecialistType;
  issue: string;
}

export interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
}

export interface AgentRun {
  id: string;
  title: string;
  requirements: string;
  status: RunStatus;
  provider: string;
  outputs: Partial<Record<SpecialistType, AgentOutput>>;
  review?: ReviewResult;
  report?: string;
  usage: TokenUsage;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type RunEvent =
  | { type: "run_started"; runId: string; provider: string }
  | { type: "stage_started"; runId: string; stage: string; agents: SpecialistType[] }
  | { type: "agent_started"; runId: string; agent: SpecialistType; revision: number }
  | { type: "llm_call"; runId: string; agent: SpecialistType; step: number; usage: TokenUsage }
  | { type: "tool_call"; runId: string; agent: SpecialistType; tool: string; input: unknown }
  | { type: "tool_result"; runId: string; agent: SpecialistType; tool: string; output: unknown }
  | { type: "agent_completed"; runId: string; agent: SpecialistType; output: AgentOutput }
  | { type: "review"; runId: string; result: ReviewResult }
  | { type: "run_completed"; runId: string; usage: TokenUsage }
  | { type: "run_failed"; runId: string; error: string };

export interface CreateRunInput {
  title: string;
  requirements: string;
}
