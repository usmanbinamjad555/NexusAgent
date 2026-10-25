import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { AgentRun, CreateRunInput, RunEvent } from "@nexus-agent/types";

type RunListener = (event: RunEvent) => void;

/**
 * In-memory run registry with a per-run event log. Late SSE subscribers replay the
 * log first, so a client that connects after the run started still sees every step.
 */
export class RunStore {
  private readonly runs = new Map<string, AgentRun>();
  private readonly logs = new Map<string, RunEvent[]>();
  private readonly bus = new EventEmitter();

  create(input: CreateRunInput, provider: string): AgentRun {
    const now = new Date().toISOString();
    const run: AgentRun = {
      id: randomUUID(),
      title: input.title,
      requirements: input.requirements,
      status: "queued",
      provider,
      outputs: {},
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(run.id, run);
    this.logs.set(run.id, []);
    return run;
  }

  get(id: string): AgentRun | undefined {
    return this.runs.get(id);
  }

  list(): AgentRun[] {
    return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(id: string, patch: Partial<AgentRun>): void {
    const run = this.runs.get(id);
    if (run) Object.assign(run, patch, { updatedAt: new Date().toISOString() });
  }

  emit(event: RunEvent): void {
    this.logs.get(event.runId)?.push(event);
    this.bus.emit(event.runId, event);
  }

  /** Replays past events, then streams new ones. Returns an unsubscribe function. */
  subscribe(runId: string, listener: RunListener): () => void {
    for (const event of this.logs.get(runId) ?? []) listener(event);
    this.bus.on(runId, listener);
    return () => this.bus.off(runId, listener);
  }
}

export const runStore = new RunStore();
