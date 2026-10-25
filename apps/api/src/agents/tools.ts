import { z } from "zod";
import type { ToolDefinition } from "./llm/types";

export interface AgentTool {
  definition: ToolDefinition;
  run(input: unknown): unknown;
}

const OWASP_RISKS: Array<{ id: string; title: string; keywords: RegExp }> = [
  { id: "A01", title: "Broken access control", keywords: /(user|admin|role|account|login|tenant)/i },
  {
    id: "A02",
    title: "Cryptographic failures",
    keywords: /(payment|card|password|pii|health|personal|secret)/i,
  },
  { id: "A03", title: "Injection", keywords: /(search|query|form|upload|report|filter)/i },
  { id: "A05", title: "Security misconfiguration", keywords: /(deploy|cloud|api|docker|server)/i },
  {
    id: "A07",
    title: "Identification and authentication failures",
    keywords: /(login|auth|sso|signup|session)/i,
  },
  {
    id: "A08",
    title: "Software and data integrity failures",
    keywords: /(webhook|plugin|integration|update)/i,
  },
  { id: "A09", title: "Security logging and monitoring failures", keywords: /./ },
];

const scopeInput = z.object({ features: z.array(z.string()).min(1) });
const owaspInput = z.object({ text: z.string() });
const schemaInput = z.object({ entities: z.array(z.string()).min(1) });
const infraInput = z.object({ expectedUsers: z.number().int().positive() });
const costInput = z.object({
  expectedUsers: z.number().int().positive(),
  tier: z.enum(["starter", "growth", "scale"]),
});

const TIERS = {
  starter: { label: "1 app instance, managed Postgres, small Redis", base: 45 },
  growth: { label: "2-3 app instances behind a load balancer, HA Postgres, Redis", base: 320 },
  scale: { label: "autoscaling container group, Postgres primary + replicas, Redis cluster", base: 1450 },
} as const;

export const pickTier = (users: number): keyof typeof TIERS =>
  users < 5_000 ? "starter" : users < 100_000 ? "growth" : "scale";

export const TOOLS: Record<string, AgentTool> = {
  estimate_scope: {
    definition: {
      name: "estimate_scope",
      description: "Estimate effort in story points and calendar weeks for a list of features.",
      input_schema: {
        type: "object",
        properties: { features: { type: "array", items: { type: "string" } } },
        required: ["features"],
      },
    },
    run(input) {
      const { features } = scopeInput.parse(input);
      const points = features.reduce(
        (sum, f) => sum + Math.max(2, Math.min(13, Math.ceil(f.split(/\s+/).length / 2))),
        0,
      );
      return {
        features: features.length,
        storyPoints: points,
        estimatedWeeks: Math.max(1, Math.ceil(points / 20)),
      };
    },
  },
  owasp_checklist: {
    definition: {
      name: "owasp_checklist",
      description: "Return the OWASP Top 10 risks that are relevant to a piece of requirements text.",
      input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
    run(input) {
      const { text } = owaspInput.parse(input);
      return {
        risks: OWASP_RISKS.filter((r) => r.keywords.test(text)).map(({ id, title }) => ({ id, title })),
      };
    },
  },
  design_schema: {
    definition: {
      name: "design_schema",
      description: "Propose relational tables (columns and indexes) for a list of domain entities.",
      input_schema: {
        type: "object",
        properties: { entities: { type: "array", items: { type: "string" } } },
        required: ["entities"],
      },
    },
    run(input) {
      const { entities } = schemaInput.parse(input);
      return {
        tables: entities.map((e) => {
          const name = e.trim().toLowerCase().replace(/\s+/g, "_");
          const isUser = name === "user";
          return {
            table: `${name}s`,
            columns: [
              "id (cuid, pk)",
              "created_at",
              "updated_at",
              isUser ? "email (unique)" : "owner_id (fk, indexed)",
            ],
            indexes: [isUser ? "email" : "owner_id, created_at"],
          };
        }),
      };
    },
  },
  pick_infra: {
    definition: {
      name: "pick_infra",
      description: "Recommend a hosting tier for an expected number of users.",
      input_schema: {
        type: "object",
        properties: { expectedUsers: { type: "integer" } },
        required: ["expectedUsers"],
      },
    },
    run(input) {
      const { expectedUsers } = infraInput.parse(input);
      const tier = pickTier(expectedUsers);
      return { tier, description: TIERS[tier].label };
    },
  },
  estimate_monthly_cost: {
    definition: {
      name: "estimate_monthly_cost",
      description: "Estimate monthly hosting cost in USD for a user count and hosting tier.",
      input_schema: {
        type: "object",
        properties: {
          expectedUsers: { type: "integer" },
          tier: { type: "string", enum: ["starter", "growth", "scale"] },
        },
        required: ["expectedUsers", "tier"],
      },
    },
    run(input) {
      const { expectedUsers, tier } = costInput.parse(input);
      const infra = TIERS[tier].base;
      const bandwidthAndStorage = Math.round(expectedUsers * 0.004);
      const monitoring = tier === "starter" ? 0 : 40;
      return {
        infraUsd: infra,
        bandwidthAndStorageUsd: bandwidthAndStorage,
        monitoringUsd: monitoring,
        totalMonthlyUsd: infra + bandwidthAndStorage + monitoring,
      };
    },
  },
};
