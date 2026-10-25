import { z } from "zod";
import type {
  AgentOutput,
  AgentRun,
  ReviewResult,
  RunEvent,
  SpecialistType,
  TokenUsage,
} from "@nexus-agent/types";
import type { LlmProvider } from "./llm/types";
import { agentOutputSchema, runAgent } from "./runtime";
import type { RunStore } from "./runStore";
import {
  REVIEWER_SYSTEM,
  SPECIALISTS,
  buildPrompt,
  buildReviewPrompt,
  type PromptContext,
} from "./specialists";

const reviewSchema = z.object({
  approved: z.boolean(),
  issues: z.array(
    z.object({ agent: z.enum(["PM", "SECURITY", "DATABASE", "DEVOPS", "COST"]), issue: z.string() }),
  ),
});

const PARALLEL_STAGE: SpecialistType[] = ["SECURITY", "DATABASE", "DEVOPS", "COST"];
const MAX_REVISIONS = 1;

export interface OrchestratorOptions {
  provider: LlmProvider;
  store: RunStore;
  onFinished?(run: AgentRun): Promise<void> | void;
}

const addUsage = (total: TokenUsage, add: TokenUsage): void => {
  total.inputTokens += add.inputTokens;
  total.outputTokens += add.outputTokens;
  total.costUsd += add.costUsd;
};

/**
 * Multi-agent pipeline:
 *   PM plans -> Security / Database / DevOps / Cost work in parallel on that plan
 *   -> Reviewer checks coherence -> flagged agents revise once -> final report.
 */
export async function executeRun(runId: string, opts: OrchestratorOptions): Promise<void> {
  const { provider, store } = opts;
  const run = store.get(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const emit = (event: RunEvent): void => store.emit(event);
  const total: TokenUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const outputs: Partial<Record<SpecialistType, AgentOutput>> = {};

  const work = async (type: SpecialistType, ctx: PromptContext, revision: number): Promise<void> => {
    const spec = SPECIALISTS[type];
    emit({ type: "agent_started", runId, agent: type, revision });
    const { result, steps, usage } = await runAgent({
      provider,
      agentId: type,
      system: spec.system,
      prompt: buildPrompt(ctx),
      toolNames: spec.tools,
      schema: agentOutputSchema,
      hooks: {
        onLlmCall: (step, u) => emit({ type: "llm_call", runId, agent: type, step, usage: u }),
        onToolCall: (tool, input) => emit({ type: "tool_call", runId, agent: type, tool, input }),
        onToolResult: (tool, output) => emit({ type: "tool_result", runId, agent: type, tool, output }),
      },
    });
    addUsage(total, usage);
    const output: AgentOutput = { agent: type, ...result, steps, usage, revision };
    outputs[type] = output;
    store.update(runId, { outputs: { ...outputs }, usage: { ...total } });
    emit({ type: "agent_completed", runId, agent: type, output });
  };

  const review = async (): Promise<ReviewResult> => {
    const { result, usage } = await runAgent({
      provider,
      agentId: "REVIEWER",
      system: REVIEWER_SYSTEM,
      prompt: buildReviewPrompt(outputs),
      toolNames: [],
      schema: reviewSchema,
    });
    addUsage(total, usage);
    emit({ type: "review", runId, result });
    return result;
  };

  try {
    store.update(runId, { status: "running" });
    emit({ type: "run_started", runId, provider: provider.name });
    const base = { title: run.title, requirements: run.requirements };

    emit({ type: "stage_started", runId, stage: "planning", agents: ["PM"] });
    await work("PM", base, 0);

    emit({ type: "stage_started", runId, stage: "specialists", agents: PARALLEL_STAGE });
    await Promise.all(PARALLEL_STAGE.map((t) => work(t, { ...base, prior: outputs }, 0)));

    emit({ type: "stage_started", runId, stage: "review", agents: [] });
    let verdict = await review();
    for (let revision = 1; !verdict.approved && revision <= MAX_REVISIONS; revision++) {
      const flagged = [...new Set(verdict.issues.map((i) => i.agent))].filter((a) => a !== "PM");
      emit({ type: "stage_started", runId, stage: "revision", agents: flagged });
      await Promise.all(
        flagged.map((t) =>
          work(
            t,
            {
              ...base,
              prior: outputs,
              feedback: verdict.issues.filter((i) => i.agent === t).map((i) => i.issue),
            },
            revision,
          ),
        ),
      );
      verdict = await review();
    }

    const finished = store.get(runId);
    store.update(runId, {
      status: "completed",
      review: verdict,
      report: renderReport(run.title, outputs),
      usage: { ...total },
    });
    emit({ type: "run_completed", runId, usage: { ...total } });
    if (finished) {
      await Promise.resolve(opts.onFinished?.(store.get(runId) ?? finished)).catch((err: unknown) =>
        console.error(`[persist] run ${runId} not saved:`, err),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.update(runId, { status: "failed", error: message, usage: { ...total } });
    emit({ type: "run_failed", runId, error: message });
  }
}

export const renderReport = (
  title: string,
  outputs: Partial<Record<SpecialistType, AgentOutput>>,
): string => {
  const parts = [`# ${title}: architecture brief`];
  for (const type of ["PM", ...PARALLEL_STAGE] as SpecialistType[]) {
    const o = outputs[type];
    if (!o) continue;
    parts.push(`## ${SPECIALISTS[type].title}`, o.summary);
    for (const s of o.sections) {
      parts.push(`### ${s.heading}`, s.items.map((i) => `- ${i}`).join("\n"));
    }
  }
  return parts.join("\n\n");
};
