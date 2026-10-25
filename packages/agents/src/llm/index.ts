import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import type { LlmProvider } from "./types";

export * from "./types";

export interface ProviderOptions {
  anthropicApiKey?: string | undefined;
  anthropicModel?: string | undefined;
  geminiApiKey?: string | undefined;
  geminiModel?: string | undefined;
  /** Simulated latency for the mock, so streaming is visible in demos. */
  mockDelayMs?: number | undefined;
}

/** Claude if ANTHROPIC_API_KEY is set, else Gemini if GEMINI_API_KEY is set, else the offline mock. */
export const createProvider = (opts: ProviderOptions = {}): LlmProvider => {
  if (opts.anthropicApiKey) {
    return new AnthropicProvider(opts.anthropicApiKey, opts.anthropicModel ?? "claude-sonnet-5-5");
  }
  if (opts.geminiApiKey) {
    return new GeminiProvider(opts.geminiApiKey, opts.geminiModel ?? "gemini-3.5-flash-lite");
  }
  return new MockProvider(opts.mockDelayMs ?? 0);
};

export const createMockProvider = (delayMs = 0): LlmProvider => new MockProvider(delayMs);
