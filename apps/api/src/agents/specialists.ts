import type { AgentOutput, SpecialistType } from "@nexus-agent/types";

export interface SpecialistSpec {
  type: SpecialistType;
  title: string;
  system: string;
  tools: string[];
}

const FORMAT = `Reply with ONLY a JSON object: {"summary": string, "sections": [{"heading": string, "items": string[]}]}. Be concrete and concise (3-5 sections, max 6 items each). Call your tool first, then base your answer on its result.`;

export const SPECIALISTS: Record<SpecialistType, SpecialistSpec> = {
  PM: {
    type: "PM",
    title: "Product Manager",
    tools: ["estimate_scope"],
    system: `You are the Product Manager agent. Turn raw requirements into a scoped product plan: goals, core features (as a list), user stories, MVP cut and an effort estimate. ${FORMAT}`,
  },
  SECURITY: {
    type: "SECURITY",
    title: "Security Architect",
    tools: ["owasp_checklist"],
    system: `You are the Security agent. Threat-model the product plan: relevant OWASP risks with a mitigation each, authentication/authorization design, secrets and data protection. ${FORMAT}`,
  },
  DATABASE: {
    type: "DATABASE",
    title: "Database Architect",
    tools: ["design_schema"],
    system: `You are the Database agent. Design the data layer: entities, tables with keys and indexes, migration and backup approach. ${FORMAT}`,
  },
  DEVOPS: {
    type: "DEVOPS",
    title: "DevOps Engineer",
    tools: ["pick_infra"],
    system: `You are the DevOps agent. Design delivery and runtime: hosting tier, CI/CD, environments, observability, and backup/disaster recovery. ${FORMAT}`,
  },
  COST: {
    type: "COST",
    title: "Cost Analyst",
    tools: ["estimate_monthly_cost"],
    system: `You are the Cost agent. Estimate monthly run cost and the main cost drivers, plus 2-3 optimisation levers. Use the hosting tier implied by the expected user count. ${FORMAT}`,
  },
};

export const REVIEWER_SYSTEM = `You are the Reviewer agent. Check the specialist outputs for gaps and contradictions between them (for example a security requirement with no matching infrastructure or data design). Reply with ONLY a JSON object: {"approved": boolean, "issues": [{"agent": "PM"|"SECURITY"|"DATABASE"|"DEVOPS"|"COST", "issue": string}]}. Approve (empty issues) when the plan is coherent and complete; only list issues that need a rewrite by that agent.`;

export interface PromptContext {
  title: string;
  requirements: string;
  prior?: Partial<Record<SpecialistType, AgentOutput>>;
  feedback?: string[];
}

const renderOutput = (o: AgentOutput): string =>
  [o.summary, ...o.sections.map((s) => `${s.heading}:\n${s.items.map((i) => `- ${i}`).join("\n")}`)].join("\n");

export const buildPrompt = (ctx: PromptContext): string => {
  const parts = [`# Project: ${ctx.title}`, `## Requirements\n${ctx.requirements.trim()}`];
  const pm = ctx.prior?.PM;
  if (pm) parts.push(`## Product plan (from PM)\n${renderOutput(pm)}`);
  if (ctx.feedback?.length) {
    parts.push(`## Reviewer feedback (address every point)\n${ctx.feedback.map((f) => `- ${f}`).join("\n")}`);
  }
  return parts.join("\n\n");
};

export const buildReviewPrompt = (outputs: Partial<Record<SpecialistType, AgentOutput>>): string =>
  [
    "## Agent outputs",
    ...Object.values(outputs).map((o) => `### ${o.agent}\n${renderOutput(o)}`),
  ].join("\n\n");
