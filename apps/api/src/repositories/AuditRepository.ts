import { prisma } from "@/lib/prisma";
import type { LogLevel, AuditLog, Prisma } from "@prisma/client";

export interface CreateAuditLogInput {
  projectBriefId: string;
  stage: string;
  message: string;
  level?: LogLevel;
  metadata?: Prisma.InputJsonValue;
}

export class AuditRepository {
  /**
   * Record a new audit log entry
   */
  async log(data: CreateAuditLogInput): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        projectBriefId: data.projectBriefId,
        stage: data.stage,
        message: data.message,
        level: data.level ?? "INFO",
        metadata: data.metadata ?? undefined,
      },
    });
  }

  /**
   * Retrieve all audit logs for a given project brief
   */
  async findByBriefId(projectBriefId: string): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { projectBriefId },
      orderBy: { timestamp: "desc" },
    });
  }
}

export const auditRepository = new AuditRepository();

