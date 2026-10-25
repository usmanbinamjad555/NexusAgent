import type { AgentRun, SpecialistType } from "@nexus-agent/types";

/**
 * Optional write-through to Postgres (enable with PERSIST_RUNS=true). Repositories are
 * imported lazily so the agent pipeline runs without a database or generated Prisma client.
 */
export async function persistRun(run: AgentRun): Promise<void> {
  const [{ projectRepository }, { artifactRepository }, { auditRepository }] = await Promise.all([
    import("@/repositories/ProjectRepository"),
    import("@/repositories/ArtifactRepository"),
    import("@/repositories/AuditRepository"),
  ]);

  const brief = await projectRepository.create({ title: run.title, rawRequirements: run.requirements });
  for (const output of Object.values(run.outputs)) {
    await artifactRepository.create({
      projectBriefId: brief.id,
      agentType: output.agent satisfies SpecialistType,
      payload: JSON.parse(JSON.stringify(output)),
      version: output.revision + 1,
    });
  }
  await auditRepository.log({
    projectBriefId: brief.id,
    stage: "run",
    message: `Run ${run.id} completed with provider ${run.provider}`,
    metadata: JSON.parse(JSON.stringify({ usage: run.usage, review: run.review ?? null })),
  });
  await projectRepository.updateStatus(brief.id, "COMPLETED");
}
