import type { ContentBlock, LlmProvider, LlmRequest, LlmResponse } from "./types";

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage: { input_tokens: number; output_tokens: number };
}

/** Anthropic Messages API over fetch, so the provider needs no SDK dependency. */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const body = {
      model: this.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: request.system,
      messages: request.messages,
      ...(request.tools.length > 0 && { tools: request.tools }),
    };

    for (let attempt = 0; ; attempt++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      // Retry transient failures (rate limit / overload) with exponential backoff
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as AnthropicResponse;
      return {
        content: data.content,
        stopReason: data.stop_reason === "tool_use" ? "tool_use" : data.stop_reason === "max_tokens" ? "max_tokens" : "end_turn",
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      };
    }
  }
}
