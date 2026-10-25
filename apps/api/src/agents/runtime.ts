import { z } from "zod";
import type { TokenUsage } from "@nexus-agent/types";
import { estimateCostUsd } from "./llm/types";
import type { ContentBlock, LlmMessage, LlmProvider, ToolDefinition } from "./llm/types";
import { TOOLS } from "./tools";

export const agentOutputSchema = z.object({
  summary: z.string().min(1),
  sections: z.array(z.object({ heading: z.string(), items: z.array(z.string()) })),
});
export type AgentResult = z.infer<typeof agentOutputSchema>;

export interface RuntimeHooks {
  onLlmCall?(step: number, usage: TokenUsage): void;
  onToolCall?(tool: string, input: unknown): void;
  onToolResult?(tool: string, output: unknown): void;
}

export interface RunAgentOptions<T> {
  provider: LlmProvider;
  agentId: string;
  system: string;
  prompt: string;
  toolNames: string[];
  schema: z.ZodType<T>;
  maxSteps?: number;
  maxTokens?: number;
  temperature?: number;
  hooks?: RuntimeHooks;
}

export interface RunAgentResult<T> {
  result: T;
  steps: number;
  usage: TokenUsage;
}

const extractJson = (text: string): unknown => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model reply");
  return JSON.parse(text.slice(start, end + 1));
};

/**
 * The agent loop: call the model, execute any requested tools, feed results back,
 * and stop when the model returns a valid structured answer or the step budget runs out.
 */
export async function runAgent<T>(opts: RunAgentOptions<T>): Promise<RunAgentResult<T>> {
  const { provider, hooks, maxSteps = 6 } = opts;
  const tools: ToolDefinition[] = opts.toolNames.map((name) => {
    const tool = TOOLS[name];
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.definition;
  });
  const messages: LlmMessage[] = [{ role: "user", content: [{ type: "text", text: opts.prompt }] }];
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  let repaired = false;

  for (let step = 1; step <= maxSteps; step++) {
    const res = await provider.complete({
      agentId: opts.agentId,
      system: opts.system,
      messages,
      tools,
      maxTokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.2,
    });
    usage.inputTokens += res.inputTokens;
    usage.outputTokens += res.outputTokens;
    usage.costUsd += estimateCostUsd(provider.model, res.inputTokens, res.outputTokens);
    hooks?.onLlmCall?.(step, { ...usage });
    messages.push({ role: "assistant", content: res.content });

    const toolUses = res.content.filter(
      (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use",
    );
    if (toolUses.length > 0) {
      const results: ContentBlock[] = toolUses.map((use) => {
        hooks?.onToolCall?.(use.name, use.input);
        try {
          const tool = TOOLS[use.name];
          if (!tool || !opts.toolNames.includes(use.name)) {
            throw new Error(`tool '${use.name}' is not available to this agent`);
          }
          const output = tool.run(use.input);
          hooks?.onToolResult?.(use.name, output);
          return { type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output) };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          hooks?.onToolResult?.(use.name, { error: message });
          return { type: "tool_result", tool_use_id: use.id, content: message, is_error: true };
        }
      });
      messages.push({ role: "user", content: results });
      continue;
    }

    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    try {
      return { result: opts.schema.parse(extractJson(text)), steps: step, usage };
    } catch (err) {
      if (repaired) {
        throw new Error(
          `Agent ${opts.agentId} returned invalid output: ${err instanceof Error ? err.message : err}`,
        );
      }
      repaired = true;
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Your reply was not valid. Respond with ONLY the JSON object in the requested shape.",
          },
        ],
      });
    }
  }
  throw new Error(`Agent ${opts.agentId} exceeded ${maxSteps} steps`);
}
