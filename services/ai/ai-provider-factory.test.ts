import { describe, expect, it } from "@jest/globals";
import { getAIProvider } from "./ai-provider-factory";

describe("ai provider factory", () => {
  it("returns mock provider when configured", () => {
    const provider = getAIProvider({ provider: "mock" });
    expect(typeof provider.generateSummary).toBe("function");
  });

  it("fails safely when openai provider is requested without API key", () => {
    expect(() => getAIProvider({ provider: "openai", apiKey: "" })).toThrow("OPENAI_API_KEY is not configured.");
  });

  it("can instantiate openai provider when API key is supplied", () => {
    const provider = getAIProvider({ provider: "openai", apiKey: "test-key", model: "gpt-4.1-mini" });
    expect(typeof provider.generateSummary).toBe("function");
  });
});
