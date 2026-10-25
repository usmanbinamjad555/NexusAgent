import { prisma } from "@/lib/prisma";
import type { BriefStatus, ProjectBrief, Prisma } from "@prisma/client";

export interface CreateProjectBriefInput {
  title: string;
  rawRequirements: string;
  userId?: string | null;
}

export interface ListProjectBriefsFilter {
  userId?: string;
  status?: BriefStatus;
}

export class ProjectRepository {
  /**
   * Create a new Project Brief
   */
  async create(data: CreateProjectBriefInput): Promise<ProjectBrief> {
    return prisma.projectBrief.create({
      data: {
        title: data.title,
        rawRequirements: data.rawRequirements,
        userId: data.userId ?? null,
      },
    });
  }

  /**
   * Find a Project Brief by ID including its artifacts and audit logs
   */
  async findById(id: string) {
    return prisma.projectBrief.findUnique({
      where: { id },
      include: {
        artifacts: {
          orderBy: { createdAt: "desc" },
        },
        auditLogs: {
          orderBy: { timestamp: "desc" },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * List project briefs with optional filters
   */
  async list(filter?: ListProjectBriefsFilter): Promise<ProjectBrief[]> {
    const where: Prisma.ProjectBriefWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    return prisma.projectBrief.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update project brief status
   */
  async updateStatus(id: string, status: BriefStatus): Promise<ProjectBrief> {
    return prisma.projectBrief.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Delete a project brief by ID
   */
  async delete(id: string): Promise<ProjectBrief> {
    return prisma.projectBrief.delete({
      where: { id },
    });
  }
}

export const projectRepository = new ProjectRepository();

