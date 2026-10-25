import { z } from "zod";
import { RunStore, createMockProvider, createProvider, executeRun } from "@nexus-agent/agents";
import type { LlmProvider } from "@nexus-agent/agents";

// Self-contained demo endpoint: runs the whole multi-agent pipeline inside this request
// and streams every agent event back as Server-Sent Events. Stateless, so it works on
// serverless hosting.
//
// Provider order: Claude (ANTHROPIC_API_KEY) -> Gemini (GEMINI_API_KEY) -> offline mock.
// A real-model run that fails (quota, outage, bad output) is retried once on the mock, and
// visitors over the rate limit are served by the mock, so the demo never breaks or burns quota.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  title: z.string().trim().min(2).max(120),
  requirements: z.string().trim().min(10).max(4000),
});

const WINDOW_MS = 60 * 60 * 1000;
const REAL_RUNS_PER_IP = 3;
const REAL_RUNS_PER_DAY = 150;
const hitsByIp = new Map<string, number[]>();
let dayStart = Date.now();
let dayCount = 0;

// Best-effort: counters live in this serverless instance's memory
const allowRealRun = (ip: string): boolean => {
  const now = Date.now();
  if (now - dayStart > 24 * WINDOW_MS) {
    dayStart = now;
    dayCount = 0;
  }
  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= REAL_RUNS_PER_IP || dayCount >= REAL_RUNS_PER_DAY) {
    hitsByIp.set(ip, recent);
    return false;
  }
  hitsByIp.set(ip, [...recent, now]);
  dayCount++;
  return true;
};

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const real = createProvider({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
  });
  const mock = createMockProvider(900);
  const isReal = real.name !== "mock";
  const limited = isReal && !allowRealRun(ip);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      const attempt = async (provider: LlmProvider): Promise<boolean> => {
        const store = new RunStore();
        const run = store.create(parsed.data, provider.name);
        store.subscribe(run.id, (e) => send(e.type, e));
        await executeRun(run.id, { provider, store });
        const done = store.get(run.id);
        if (done?.status === "completed" && done.report) send("report", { report: done.report });
        return done?.status === "completed";
      };

      if (limited) {
        send("notice", { message: "Live model limit reached for now, so this run uses the offline demo model." });
        await attempt(mock);
      } else if (!(await attempt(real)) && isReal) {
        send("notice", { message: `${real.name} was unavailable, so this run was redone on the offline demo model.` });
        await attempt(mock);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
