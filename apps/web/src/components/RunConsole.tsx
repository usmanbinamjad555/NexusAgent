"use client";

import React, { useState } from "react";
import type {
  AgentOutput,
  ReviewResult,
  RunEvent,
  SpecialistType,
  TokenUsage,
} from "@nexus-agent/types";

const AGENTS: Array<{ type: SpecialistType; label: string }> = [
  { type: "PM", label: "Product Manager" },
  { type: "SECURITY", label: "Security" },
  { type: "DATABASE", label: "Database" },
  { type: "DEVOPS", label: "DevOps" },
  { type: "COST", label: "Cost" },
];

const SAMPLE =
  "An online store where customers sign up, browse products, pay by card and track orders. Admins manage products and orders. Expect 20,000 users.";

interface AgentView {
  status: "waiting" | "working" | "done";
  revision: number;
  tools: string[];
  output?: AgentOutput;
}

const emptyAgents = (): Record<SpecialistType, AgentView> => ({
  PM: { status: "waiting", revision: 0, tools: [] },
  SECURITY: { status: "waiting", revision: 0, tools: [] },
  DATABASE: { status: "waiting", revision: 0, tools: [] },
  DEVOPS: { status: "waiting", revision: 0, tools: [] },
  COST: { status: "waiting", revision: 0, tools: [] },
});

export function RunConsole() {
  const [title, setTitle] = useState("Online store");
  const [requirements, setRequirements] = useState(SAMPLE);
  const [agents, setAgents] = useState(emptyAgents);
  const [stage, setStage] = useState<string>("");
  const [reviews, setReviews] = useState<ReviewResult[]>([]);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [report, setReport] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [error, setError] = useState<string>("");
  const apply = (event: RunEvent) => {
    switch (event.type) {
      case "run_started":
        setProvider(event.provider);
        break;
      case "stage_started":
        setStage(event.stage);
        break;
      case "agent_started":
        setAgents((a) => ({
          ...a,
          [event.agent]: { ...a[event.agent], status: "working", revision: event.revision, tools: [] },
        }));
        break;
      case "tool_call":
        setAgents((a) => ({
          ...a,
          [event.agent]: { ...a[event.agent], tools: [...a[event.agent].tools, event.tool] },
        }));
        break;
      case "agent_completed":
        setAgents((a) => ({
          ...a,
          [event.agent]: { ...a[event.agent], status: "done", output: event.output },
        }));
        break;
      case "review":
        setReviews((r) => [...r, event.result]);
        break;
      case "run_completed":
        setUsage(event.usage);
        setStatus("completed");
        break;
      case "run_failed":
        setError(event.error);
        setStatus("failed");
        break;
      default:
        break;
    }
  };

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgents(emptyAgents());
    setReviews([]);
    setReport("");
    setUsage(null);
    setError("");
    setStage("");
    setStatus("running");
    try {
      const res = await fetch("/api/demo-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, requirements }),
      });
      if (!res.ok || !res.body) throw new Error("Could not start run");
      // Parse the Server-Sent Events stream: blocks separated by a blank line
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const name = /^event: (.*)$/m.exec(block)?.[1];
          const data = /^data: (.*)$/m.exec(block)?.[1];
          if (!name || !data) continue;
          if (name === "report") setReport((JSON.parse(data) as { report: string }).report);
          else apply(JSON.parse(data) as RunEvent);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("failed");
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-100">Multi-Agent Architecture Run</h2>
      <p className="text-sm text-slate-400">
        Describe a product. A PM agent plans it, four specialists work in parallel, a reviewer checks
        the result, and flagged agents revise.
      </p>

      <form onSubmit={start} className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minLength={2}
          required
          aria-label="Project title"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          minLength={10}
          required
          rows={4}
          aria-label="Requirements"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status === "running"}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === "running" ? `Running (${stage || "starting"})...` : "Run agents"}
          </button>
          {provider && (
            <span className="text-xs text-slate-400">
              provider: <span className="font-mono text-indigo-300">{provider}</span>
            </span>
          )}
          {usage && (
            <span className="text-xs text-slate-400">
              {usage.inputTokens + usage.outputTokens} tokens, ${usage.costUsd.toFixed(4)}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map(({ type, label }) => {
          const a = agents[type];
          return (
            <div key={type} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{label}</h3>
                <span
                  className={`text-xs font-semibold ${
                    a.status === "done" ? "text-emerald-400" : a.status === "working" ? "text-amber-400" : "text-slate-500"
                  }`}
                >
                  {a.status}
                  {a.revision > 0 ? ` (revision ${a.revision})` : ""}
                </span>
              </div>
              {a.tools.length > 0 && (
                <p className="mt-1 font-mono text-xs text-indigo-300">tool: {a.tools.join(", ")}</p>
              )}
              {a.output && (
                <div className="mt-2 text-xs text-slate-300">
                  <p>{a.output.summary}</p>
                  {a.output.sections.map((s) => (
                    <div key={s.heading} className="mt-2">
                      <p className="font-semibold text-slate-200">{s.heading}</p>
                      <ul className="list-disc pl-4 text-slate-400">
                        {s.items.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {reviews.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <h3 className="font-bold text-white">Reviewer</h3>
          {reviews.map((r, i) => (
            <p key={i} className={r.approved ? "text-emerald-400" : "text-amber-400"}>
              Pass {i + 1}: {r.approved ? "approved" : r.issues.map((x) => `${x.agent}: ${x.issue}`).join("; ")}
            </p>
          ))}
        </div>
      )}

      {report && (
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
          {report}
        </pre>
      )}
    </section>
  );
}
