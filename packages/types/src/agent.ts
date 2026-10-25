export type AgentStatus = "idle" | "running" | "paused" | "failed" | "terminated";

export type AgentCapability =
  "code_execution" | "web_search" | "data_analysis" | "file_management" | "task_planning";

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  capabilities: AgentCapability[];
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  config: AgentConfig;
  activeTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  description: string;
  model: string;
  capabilities: AgentCapability[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  capabilities?: AgentCapability[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
