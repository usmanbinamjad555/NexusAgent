export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
      /** Opaque provider state (Gemini thought signature) that must be echoed back. */
      signature?: string;
    }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface LlmMessage {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export interface LlmRequest {
  agentId: string;
  system: string;
  messages: LlmMessage[];
  tools: ToolDefinition[];
  maxTokens: number;
  temperature: number;
}

export interface LlmResponse {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens";
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
}

// USD per million tokens
const PRICING: Record<string, { input: number; output: number }> = {
  default: { input: 3, output: 15 },
  mock: { input: 0, output: 0 },
  // Gemini free tier
  "gemini-3.5-flash-lite": { input: 0, output: 0 },
};

export const estimateCostUsd = (model: string, inputTokens: number, outputTokens: number): number => {
  const price = PRICING[model] ?? PRICING["default"]!;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
};
