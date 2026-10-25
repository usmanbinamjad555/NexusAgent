import { PrismaClient, AgentType, BriefStatus, LogLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 [Seed] Seeding database...");

  // 1. Create or upsert demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@nexusagent.ai" },
    update: {},
    create: {
      email: "demo@nexusagent.ai",
      name: "Nexus Demo User",
    },
  });
  console.log(`👤 Created or found user: ${user.email} (${user.id})`);

  // 2. Create sample project brief
  const brief = await prisma.projectBrief.create({
    data: {
      userId: user.id,
      title: "Autonomous Customer Support AI Agent",
      rawRequirements:
        "Build a multi-agent workflow for automating tiered customer support tickets with sentiment analysis, Gemini Flash response generation, and automated human escalation.",
      status: BriefStatus.COMPLETED,
    },
  });
  console.log(`📋 Created sample project brief: "${brief.title}" (${brief.id})`);

  // 3. Create sample PM AgentArtifact
  const artifact = await prisma.agentArtifact.create({
    data: {
      projectBriefId: brief.id,
      agentType: AgentType.PM,
      payload: {
        specVersion: "1.0.0",
        objective: "Autonomous multi-agent customer support pipeline",
        architecture: {
          runtime: "Node.js 22 / Express",
          database: "PostgreSQL with Prisma",
          queue: "Redis / BullMQ",
          aiModel: "Gemini 2.5 Flash",
        },
        keyMilestones: [
          { phase: "Ingestion", description: "REST / Webhook intake" },
          { phase: "Analysis", description: "Intent categorization and sentiment score" },
          { phase: "Resolution", description: "Automated response drafting and human review queue" },
        ],
        estimatedEffortDays: 14,
      },
      version: 1,
    },
  });
  console.log(`📦 Created sample PM artifact: ${artifact.agentType} v${artifact.version} (${artifact.id})`);

  // 4. Create sample AuditLog
  const audit = await prisma.auditLog.create({
    data: {
      projectBriefId: brief.id,
      stage: "SPEC_GENERATION",
      message: "Initial PM specification generated and verified against requirements",
      level: LogLevel.INFO,
      metadata: {
        artifactId: artifact.id,
        agentType: artifact.agentType,
      },
    },
  });
  console.log(`📝 Created audit log: [${audit.level}] ${audit.stage} - ${audit.message}`);

  console.log("✅ [Seed] Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ [Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

