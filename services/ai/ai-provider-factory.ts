import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import type { AIProvider, AIProviderConfig } from "@/services/ai/ai-provider";

export function getAIProvider(config?: AIProviderConfig): AIProvider {
  const providerName = config?.provider ?? (process.env.AI_PROVIDER === "openai" ? "openai" : "mock");

  switch (providerName) {
    case "openai":
      throw new Error("OpenAI provider is not configured yet. Set AI_PROVIDER=mock for now.");
    case "mock":
    default:
      return new MockAIProvider();
  }
}
