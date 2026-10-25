import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RunEvent } from "@nexus-agent/types";
import { MockProvider } from "../llm/mock";
import type { LlmProvider } from "../llm/types";
import { executeRun, renderReport } from "../orchestrator";
import { agentOutputSchema, runAgent } from "../runtime";
import { RunStore } from "../runStore";
import { TOOLS } from "../tools";

const REQUIREMENTS =
  "An online store with user accounts and payment checkout. Expect 20,000 users. Admins manage products and orders.";

const startRun = (provider: LlmProvider = new MockProvider()) => {
  const store = new RunStore();
  const run = store.create({ title: "Shop", requirements: REQUIREMENTS }, provider.name);
  const events: RunEvent[] = [];
  store.subscribe(run.id, (e) => events.push(e));
  return { store, run, events, provider };
};

describe("orchestrator", () => {
  it("runs PM, then four specialists, then review, and completes", async () => {
    const { store, run, events, provider } = startRun();
    await executeRun(run.id, { provider, store });

    const done = store.get(run.id)!;
    assert.equal(done.status, "completed");
    assert.deepEqual(Object.keys(done.outputs).sort(), ["COST", "DATABASE", "DEVOPS", "PM", "SECURITY"]);

    const types = events.map((e) => e.type);
    assert.equal(types[0], "run_started");
    assert.equal(types.at(-1), "run_completed");
    // PM finishes before any specialist starts
    const pmDone = events.findIndex((e) => e.type === "agent_completed" && e.agent === "PM");
    const firstSpecialist = events.findIndex((e) => e.type === "agent_started" && e.agent === "SECURITY");
    assert.ok(pmDone < firstSpecialist);
  });

  it("sends reviewer feedback back to the flagged agent for one revision", async () => {
    const { store, run, events, provider } = startRun();
    await executeRun(run.id, { provider, store });

    const reviews = events.filter((e) => e.type === "review");
    assert.equal(reviews.length, 2);
    assert.equal(reviews[0]!.type === "review" && reviews[0]!.result.approved, false);
    assert.equal(reviews[1]!.type === "review" && reviews[1]!.result.approved, true);
    assert.equal(store.get(run.id)!.outputs.DEVOPS!.revision, 1);
    assert.equal(store.get(run.id)!.outputs.SECURITY!.revision, 0);
  });

  it("derives the cost estimate from the user count in the requirements", async () => {
    const { store, run, provider } = startRun();
    await executeRun(run.id, { provider, store });
    const cost = store.get(run.id)!.outputs.COST!;
    // 20,000 users -> growth tier: 320 infra + 80 bandwidth + 40 monitoring
    assert.match(cost.summary, /\$440/);
  });

  it("marks the run failed when a provider throws", async () => {
    const broken: LlmProvider = {
      name: "broken",
      model: "broken",
      complete: () => Promise.reject(new Error("boom")),
    };
    const { store, run, events } = startRun(broken);
    await executeRun(run.id, { provider: broken, store });
    assert.equal(store.get(run.id)!.status, "failed");
    assert.equal(store.get(run.id)!.error, "boom");
    assert.equal(events.at(-1)!.type, "run_failed");
  });

  it("renders a markdown report in agent order", async () => {
    const { store, run, provider } = startRun();
    await executeRun(run.id, { provider, store });
    const report = store.get(run.id)!.report!;
    assert.ok(report.startsWith("# Shop: architecture brief"));
    assert.ok(report.indexOf("Product Manager") < report.indexOf("Cost Analyst"));
    assert.equal(renderReport("X", {}), "# X: architecture brief");
  });
});

describe("runtime", () => {
  it("rejects a tool the agent was not given", async () => {
    const calls: unknown[] = [];
    const provider: LlmProvider = {
      name: "t",
      model: "t",
      async complete(req) {
        if (req.messages.length === 1) {
          return {
            content: [{ type: "tool_use", id: "1", name: "pick_infra", input: { expectedUsers: 5 } }],
            stopReason: "tool_use",
            inputTokens: 1,
            outputTokens: 1,
          };
        }
        calls.push(req.messages.at(-1)!.content[0]);
        return {
          content: [{ type: "text", text: '{"summary":"ok","sections":[]}' }],
          stopReason: "end_turn",
          inputTokens: 1,
          outputTokens: 1,
        };
      },
    };
    await runAgent({
      provider,
      agentId: "X",
      system: "",
      prompt: "",
      toolNames: ["estimate_scope"],
      schema: agentOutputSchema,
    });
    assert.deepEqual((calls[0] as { is_error?: boolean }).is_error, true);
  });

  it("asks once for a repair and then gives up on invalid output", async () => {
    let n = 0;
    const provider: LlmProvider = {
      name: "t",
      model: "t",
      async complete() {
        n++;
        return {
          content: [{ type: "text", text: "not json" }],
          stopReason: "end_turn",
          inputTokens: 1,
          outputTokens: 1,
        };
      },
    };
    await assert.rejects(
      runAgent({ provider, agentId: "X", system: "", prompt: "", toolNames: [], schema: agentOutputSchema }),
      /invalid output/,
    );
    assert.equal(n, 2);
  });

  it("validates tool input", () => {
    assert.throws(() => TOOLS["estimate_scope"]!.run({ features: [] }));
  });
});
