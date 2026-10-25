import { z } from "zod";
import { RunStore, createProvider, executeRun } from "@nexus-agent/agents";

// Self-contained demo endpoint: runs the whole multi-agent pipeline inside this request
// and streams every agent event back as Server-Sent Events. Stateless, so it works on
// serverless hosting. Uses Claude when ANTHROPIC_API_KEY is set, otherwise the offline mock.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  title: z.string().trim().min(2).max(120),
  requirements: z.string().trim().min(10).max(4000),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const provider = createProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5", 900);
  const store = new RunStore();
  const run = store.create(parsed.data, provider.name);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      store.subscribe(run.id, (e) => send(e.type, e));
      await executeRun(run.id, { provider, store });
      const done = store.get(run.id);
      if (done?.report) send("report", { report: done.report });
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
