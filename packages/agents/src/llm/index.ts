import { AnthropicProvider } from "./anthropic";
import { MockProvider } from "./mock";
import type { LlmProvider } from "./types";

export * from "./types";

/** Uses Claude when ANTHROPIC_API_KEY is set, otherwise a deterministic offline mock. */
export const createProvider = (
  apiKey: string | undefined,
  model: string,
  mockDelayMs = 0,
): LlmProvider =>
  apiKey ? new AnthropicProvider(apiKey, model) : new MockProvider(mockDelayMs);
