import type { ContentBlock, LlmProvider, LlmRequest, LlmResponse } from "./types";

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown>; id?: string }; thoughtSignature?: string }
  | { functionResponse: { name: string; id?: string; response: Record<string, unknown> } };

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

/** Google Gemini generateContent API over fetch, with function calling mapped to our tool_use blocks. */
export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    // tool_result blocks only carry an id, but Gemini wants the function name back
    const toolNames = new Map<string, string>();
    for (const m of request.messages) {
      for (const b of m.content) if (b.type === "tool_use") toolNames.set(b.id, b.name);
    }

    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: m.content.map((b): GeminiPart => {
        if (b.type === "text") return { text: b.text };
        if (b.type === "tool_use") {
          return {
            functionCall: { name: b.name, args: b.input, id: b.id },
            ...(b.signature && { thoughtSignature: b.signature }),
          };
        }
        let output: unknown = b.content;
        try {
          output = JSON.parse(b.content);
        } catch {
          /* plain-text error message */
        }
        return {
          functionResponse: {
            name: toolNames.get(b.tool_use_id) ?? "unknown",
            id: b.tool_use_id,
            response: b.is_error ? { error: output } : { output },
          },
        };
      }),
    }));

    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents,
      ...(request.tools.length > 0 && {
        tools: [
          {
            functionDeclarations: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.input_schema,
            })),
          },
        ],
      }),
      // Headroom for the model's internal reasoning tokens, which count against the limit
      generationConfig: { temperature: request.temperature, maxOutputTokens: Math.max(request.maxTokens, 4096) },
    };

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45_000),
        },
      );
      if ((res.status === 429 || res.status === 503) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);

      const data = (await res.json()) as GeminiResponse;
      const candidate = data.candidates?.[0];
      const content: ContentBlock[] = [];
      let n = 0;
      for (const part of candidate?.content?.parts ?? []) {
        if ("text" in part && part.text) content.push({ type: "text", text: part.text });
        if ("functionCall" in part) {
          content.push({
            type: "tool_use",
            id: part.functionCall.id ?? `call_${request.agentId}_${n++}`,
            name: part.functionCall.name,
            input: part.functionCall.args ?? {},
            ...(part.thoughtSignature && { signature: part.thoughtSignature }),
          });
        }
      }
      if (content.length === 0) throw new Error(`Gemini returned no content (${candidate?.finishReason ?? "unknown"})`);

      const usage = data.usageMetadata ?? {};
      return {
        content,
        stopReason: content.some((b) => b.type === "tool_use")
          ? "tool_use"
          : candidate?.finishReason === "MAX_TOKENS"
            ? "max_tokens"
            : "end_turn",
        inputTokens: usage.promptTokenCount ?? 0,
        outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
      };
    }
  }
}
