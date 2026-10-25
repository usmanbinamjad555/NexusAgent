import React from "react";
import type { Agent, AgentStatus } from "@nexus-agent/types";

interface AgentStatusCardProps {
  agent: Agent;
}

const statusColors: Record<AgentStatus, { badge: string; dot: string; text: string }> = {
  running: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
    text: "Running",
  },
  idle: {
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
    text: "Idle",
  },
  paused: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
    text: "Paused",
  },
  failed: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dot: "bg-rose-400",
    text: "Failed",
  },
  terminated: {
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
    text: "Terminated",
  },
};

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ agent }) => {
  const currentStatus = statusColors[agent.status] || statusColors.idle;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/50 hover:bg-slate-900/80">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{agent.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{agent.config.description}</p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${currentStatus.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot}`} />
          {currentStatus.text}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.config.capabilities.map((cap) => (
          <span
            key={cap}
            className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 border border-slate-700/50"
          >
            {cap.replace("_", " ")}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400">
        <div>
          <span className="block text-slate-500">Model</span>
          <span className="font-mono text-slate-200">{agent.config.model}</span>
        </div>
        <div>
          <span className="block text-slate-500">Active Tasks</span>
          <span className="font-mono text-slate-200">{agent.activeTasks}</span>
        </div>
        <div>
          <span className="block text-slate-500">Max Tokens</span>
          <span className="font-mono text-slate-200">{agent.config.maxTokens}</span>
        </div>
      </div>
    </div>
  );
};
