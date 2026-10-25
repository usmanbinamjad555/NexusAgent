import { prisma } from "@/lib/prisma";
import type { AgentType, AgentArtifact, Prisma } from "@prisma/client";

export interface CreateArtifactInput {
  projectBriefId: string;
  agentType: AgentType;
  payload: Prisma.InputJsonValue;
  version?: number;
}

export class ArtifactRepository {
  /**
   * Create a new agent artifact
   */
  async create(data: CreateArtifactInput): Promise<AgentArtifact> {
    return prisma.agentArtifact.create({
      data: {
        projectBriefId: data.projectBriefId,
        agentType: data.agentType,
        payload: data.payload,
        version: data.version ?? 1,
      },
    });
  }

  /**
   * Find all artifacts associated with a project brief
   */
  async findByBriefId(projectBriefId: string): Promise<AgentArtifact[]> {
    return prisma.agentArtifact.findMany({
      where: { projectBriefId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find the most recent artifact for a specific agent type within a project brief
   */
  async findLatestByAgent(
    projectBriefId: string,
    agentType: AgentType,
  ): Promise<AgentArtifact | null> {
    return prisma.agentArtifact.findFirst({
      where: {
        projectBriefId,
        agentType,
      },
      orderBy: { version: "desc" },
    });
  }
}

export const artifactRepository = new ArtifactRepository();

