import { createServer } from "@/server";
import { env } from "@/config/env";

const app = createServer();

const server = app.listen(env.PORT, () => {
  console.log(`
  🚀 NexusAgent API Server running in [${env.NODE_ENV}] mode
  📡 Listening at: http://localhost:${env.PORT}
  🩺 Health check: http://localhost:${env.PORT}/api/health
  🤖 Agents API:  http://localhost:${env.PORT}/api/agents
  `);
});

// Graceful shutdown
const handleTermination = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log("HTTP server closed. Exiting process.");
    process.exit(0);
  });

  // Force close after 10s timeout
  setTimeout(() => {
    console.error("Forced shutdown timeout exceeded. Exiting immediately.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => handleTermination("SIGTERM"));
process.on("SIGINT", () => handleTermination("SIGINT"));
