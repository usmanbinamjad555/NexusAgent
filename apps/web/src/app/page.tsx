import React from "react";
import type { Agent } from "@nexus-agent/types";
import { env } from "@/lib/env";
import { AgentStatusCard } from "@/components/AgentStatusCard";

// Sample fallback agents if API is offline during build
const initialAgents: Agent[] = [
  {
    id: "agent-orchestrator-01",
    name: "Nexus Orchestrator",
    status: "running",
    config: {
      name: "Nexus Orchestrator",
      description: "Coordinates multi-agent subtasks, tool dispatches, and consensus verification",
      model: "gemini-2.0-flash",
      capabilities: ["task_planning", "code_execution"],
      temperature: 0.2,
      maxTokens: 4096,
    },
    activeTasks: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-evaluator-02",
    name: "Safety & Policy Guard",
    status: "idle",
    config: {
      name: "Safety & Policy Guard",
      description: "Static analysis and compliance verification for autonomous outputs",
      model: "gemini-2.0-flash",
      capabilities: ["data_analysis", "file_management"],
      temperature: 0.0,
      maxTokens: 2048,
    },
    activeTasks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Nexus<span className="text-indigo-400">Agent</span>
            </h1>
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              v1.0 Production Monorepo
            </span>
          </div>
          <p className="mt-2 text-base text-slate-400">
            Autonomous multi-agent orchestration platform with Next.js 15, Express.js, & Docker.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">Environment:</span>
          <span className="font-mono font-medium text-indigo-300">{env.NEXT_PUBLIC_APP_ENV}</span>
        </div>
      </div>

      {/* Monorepo Architecture Highlights */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-slate-100">Enterprise Stack Architecture</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-indigo-400 font-mono text-sm font-semibold">01 / FRONTEND</div>
            <h3 className="mt-2 text-base font-bold text-white">Next.js 15 App Router</h3>
            <p className="mt-1 text-sm text-slate-400">
              React 19, Tailwind CSS, TypeScript strict mode, and `@/*` absolute path aliases.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-indigo-400 font-mono text-sm font-semibold">02 / BACKEND</div>
            <h3 className="mt-2 text-base font-bold text-white">Express.js API</h3>
            <p className="mt-1 text-sm text-slate-400">
              Strict TypeScript, Helmet security, CORS, request validation, and graceful shutdown.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-indigo-400 font-mono text-sm font-semibold">
              03 / TYPES & CONFIG
            </div>
            <h3 className="mt-2 text-base font-bold text-white">@nexus-agent/types</h3>
            <p className="mt-1 text-sm text-slate-400">
              Shared domain models, Zod runtime validation, and centralized tsconfig presets.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-indigo-400 font-mono text-sm font-semibold">
              04 / INFRASTRUCTURE
            </div>
            <h3 className="mt-2 text-base font-bold text-white">PostgreSQL & Redis</h3>
            <p className="mt-1 text-sm text-slate-400">
              Root Docker Compose with volume persistence, healthchecks, and network isolation.
            </p>
          </div>
        </div>
      </div>

      {/* Active Agents Fleet Preview */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Configured Agent Fleet</h2>
            <p className="text-sm text-slate-400">
              Validated through shared domain schemas from{" "}
              <code className="text-indigo-300">@nexus-agent/types</code>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {initialAgents.map((agent) => (
            <AgentStatusCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Quick Start & API Integration Guide */}
      <div className="mt-12 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6">
        <h3 className="text-lg font-bold text-white">Developer Commands & Workflows</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 font-mono text-xs">
          <div className="rounded-lg bg-slate-950/80 p-4 border border-slate-800/80">
            <span className="text-indigo-400 font-sans font-semibold text-sm block mb-2">
              Monorepo Scripts
            </span>
            <p className="text-slate-300">
              <span className="text-slate-500"># Start dev servers (Next.js + Express)</span>
              <br />
              npm run dev
            </p>
            <p className="mt-2 text-slate-300">
              <span className="text-slate-500"># Typecheck all packages</span>
              <br />
              npm run typecheck
            </p>
            <p className="mt-2 text-slate-300">
              <span className="text-slate-500"># Production build</span>
              <br />
              npm run build
            </p>
          </div>

          <div className="rounded-lg bg-slate-950/80 p-4 border border-slate-800/80">
            <span className="text-indigo-400 font-sans font-semibold text-sm block mb-2">
              Database & Cache Containers
            </span>
            <p className="text-slate-300">
              <span className="text-slate-500"># Provision Postgres & Redis</span>
              <br />
              npm run docker:up
            </p>
            <p className="mt-2 text-slate-300">
              <span className="text-slate-500"># Stop containers</span>
              <br />
              npm run docker:down
            </p>
            <p className="mt-2 text-slate-300">
              <span className="text-slate-500"># Inspect logs</span>
              <br />
              npm run docker:logs
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
