import { MockAIProvider } from "@/services/ai/mock-ai-provider";
import type { AIProvider, AIProviderConfig } from "@/services/ai/ai-provider";
import { OpenAIProvider } from "@/services/ai/providers/openai.provider";

export function getAIProvider(config?: AIProviderConfig): AIProvider {
  const providerName = config?.provider ?? (process.env.AI_PROVIDER === "openai" ? "openai" : "mock");

  switch (providerName) {
    case "openai":
      return new OpenAIProvider(config?.apiKey ?? process.env.OPENAI_API_KEY, config?.model ?? process.env.OPENAI_MODEL);
    case "mock":
    default:
      return new MockAIProvider();
  }
}
