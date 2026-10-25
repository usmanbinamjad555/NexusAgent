import { pickTier } from "../tools";
import type { ContentBlock, LlmProvider, LlmRequest, LlmResponse } from "./types";

const ENTITY_WORDS = ["user", "order", "payment", "product", "invoice", "message", "project", "task", "booking", "customer"];

const requirementsOf = (req: LlmRequest): string => {
  const first = req.messages[0]?.content[0];
  const text = first?.type === "text" ? first.text : "";
  return /## Requirements\n([\s\S]*?)(?:\n\n## |$)/.exec(text)?.[1] ?? text;
};

const lastToolResult = (req: LlmRequest): Record<string, unknown> | null => {
  const last = req.messages[req.messages.length - 1];
  const block = last?.content.find((b): b is Extract<ContentBlock, { type: "tool_result" }> => b.type === "tool_result");
  return block ? (JSON.parse(block.content) as Record<string, unknown>) : null;
};

const usersIn = (text: string): number => {
  const m = /(\d[\d,]*)\s*(?:\+\s*)?(?:users|customers|members)/i.exec(text);
  return m ? Number((m[1] ?? "1000").replace(/,/g, "")) : 1000;
};

const featuresIn = (text: string): string[] => {
  const lines = text
    .split(/\n|(?<=\.)\s/)
    .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((l) => l.length > 3);
  return lines.length > 0 ? lines : [text.trim() || "core feature"];
};

const entitiesIn = (text: string): string[] => {
  const found = ENTITY_WORDS.filter((w) => new RegExp(`\\b${w}s?\\b`, "i").test(text));
  return found.length > 0 ? found : ["user", "item"];
};

const approxTokens = (s: string): number => Math.ceil(s.length / 4);

/** Deterministic offline provider that scripts a realistic tool-use round trip per agent. */
export class MockProvider implements LlmProvider {
  readonly name = "mock";
  readonly model = "mock";

  /** delayMs simulates model latency so streaming is visible in demos. */
  constructor(private readonly delayMs = 0) {}

  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    const inputTokens = approxTokens(req.system + JSON.stringify(req.messages));
    const reqText = requirementsOf(req);
    const result = lastToolResult(req);
    let content: ContentBlock[];
    let stopReason: LlmResponse["stopReason"] = "end_turn";

    if (req.agentId === "REVIEWER") {
      const first = req.messages[0]?.content[0];
      const prompt = first?.type === "text" ? first.text : "";
      const devops = /### DEVOPS\n([\s\S]*?)(?:\n\n### |$)/.exec(prompt)?.[1] ?? "";
      const missingBackup = !/backup/i.test(devops);
      content = [
        {
          type: "text",
          text: JSON.stringify({
            approved: !missingBackup,
            issues: missingBackup
              ? [{ agent: "DEVOPS", issue: "No backup or disaster-recovery plan for the database." }]
              : [],
          }),
        },
      ];
    } else if (!result) {
      stopReason = "tool_use";
      const call = this.toolCall(req.agentId, reqText);
      content = [{ type: "tool_use", id: `toolu_${req.agentId}`, name: call.name, input: call.input }];
    } else {
      content = [{ type: "text", text: JSON.stringify(this.answer(req, result, reqText)) }];
    }

    const outputTokens = approxTokens(JSON.stringify(content));
    return { content, stopReason, inputTokens, outputTokens };
  }

  private toolCall(agent: string, text: string): { name: string; input: Record<string, unknown> } {
    switch (agent) {
      case "PM":
        return { name: "estimate_scope", input: { features: featuresIn(text) } };
      case "SECURITY":
        return { name: "owasp_checklist", input: { text } };
      case "DATABASE":
        return { name: "design_schema", input: { entities: entitiesIn(text) } };
      case "DEVOPS":
        return { name: "pick_infra", input: { expectedUsers: usersIn(text) } };
      default:
        return { name: "estimate_monthly_cost", input: { expectedUsers: usersIn(text), tier: pickTier(usersIn(text)) } };
    }
  }

  private answer(req: LlmRequest, r: Record<string, unknown>, text: string) {
    const revised = /Reviewer feedback/.test(JSON.stringify(req.messages[0]));
    switch (req.agentId) {
      case "PM": {
        const features = featuresIn(text);
        return {
          summary: `Scoped ${String(r["features"])} features at ${String(r["storyPoints"])} story points, roughly ${String(r["estimatedWeeks"])} week(s).`,
          sections: [
            { heading: "Core features", items: features.slice(0, 6) },
            { heading: "MVP cut", items: features.slice(0, 3).map((f) => `Ship first: ${f}`) },
            { heading: "Estimate", items: [`${String(r["storyPoints"])} story points`, `${String(r["estimatedWeeks"])} weeks with a team of 3`] },
          ],
        };
      }
      case "SECURITY": {
        const risks = (r["risks"] as Array<{ id: string; title: string }>) ?? [];
        return {
          summary: `${risks.length} OWASP risks apply; authentication and data protection are the priorities.`,
          sections: [
            { heading: "Relevant OWASP risks", items: risks.map((x) => `${x.id} ${x.title}: add a mitigation and a test`) },
            { heading: "AuthN/AuthZ", items: ["Short-lived JWT access tokens with refresh rotation", "Role-based access checks in a single middleware"] },
            { heading: "Data protection", items: ["TLS everywhere", "Secrets in a manager, never in the repo", "Encrypt sensitive columns at rest"] },
          ],
        };
      }
      case "DATABASE": {
        const tables = (r["tables"] as Array<{ table: string; columns: string[]; indexes: string[] }>) ?? [];
        return {
          summary: `PostgreSQL schema with ${tables.length} core tables, indexed on ownership and time.`,
          sections: [
            { heading: "Tables", items: tables.map((t) => `${t.table}: ${t.columns.join(", ")}`) },
            { heading: "Indexes", items: tables.map((t) => `${t.table}(${t.indexes.join(", ")})`) },
            { heading: "Operations", items: ["Prisma migrations in CI", "Nightly logical backups with 14-day retention"] },
          ],
        };
      }
      case "DEVOPS": {
        const items = ["GitHub Actions: typecheck, test, build, deploy", "Preview, staging and production environments", "Structured logs, metrics and uptime alerts"];
        if (revised) items.push("Daily database backups, point-in-time recovery, quarterly restore drill (backup and DR plan)");
        return {
          summary: `Recommended hosting tier: ${String(r["tier"])} (${String(r["description"])}).`,
          sections: [{ heading: "Delivery and runtime", items }],
        };
      }
      default:
        return {
          summary: `Estimated run cost is about $${String(r["totalMonthlyUsd"])} per month.`,
          sections: [
            {
              heading: "Monthly breakdown",
              items: [
                `Infrastructure: $${String(r["infraUsd"])}`,
                `Bandwidth and storage: $${String(r["bandwidthAndStorageUsd"])}`,
                `Monitoring: $${String(r["monitoringUsd"])}`,
              ],
            },
            { heading: "Optimisation levers", items: ["Reserved instances once load is stable", "CDN caching for static assets", "Right-size the database after a month of metrics"] },
          ],
        };
    }
  }
}
