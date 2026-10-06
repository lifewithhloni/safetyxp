import * as nextEnv from "@next/env";
import { resolve } from "path";
nextEnv.loadEnvConfig(resolve("."), false);

const provider = process.env.AI_PROVIDER;
const key = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;
const leaks = Object.keys(process.env).filter(
  (k) => k.startsWith("NEXT_PUBLIC_") && k.toLowerCase().includes("openai")
);

console.log("AI_PROVIDER=" + provider);
console.log("AI_PROVIDER_IS_OPENAI=" + (provider === "openai"));
console.log("OPENAI_API_KEY_PRESENT=" + (!!key && key.trim().length > 0));
console.log("OPENAI_MODEL=" + (model || "not set — default gpt-4.1-mini applies"));
console.log("NEXT_PUBLIC_OPENAI_LEAK=" + (leaks.length > 0 ? leaks.join(",") : "none"));

// Verify the provider initializes without making an API request.
// OpenAIProvider constructor only validates key presence — no network call.
import("@/services/ai/providers/openai.provider").then(({ OpenAIProvider }) => {
  try {
    if (!key) {
      console.log("OPENAI_PROVIDER_INIT=SKIPPED (key not set)");
      return;
    }
    const p = new OpenAIProvider(key, model || "gpt-4.1-mini");
    console.log("OPENAI_PROVIDER_INIT=OK (provider=" + p.constructor.name + ")");
  } catch (e) {
    console.log("OPENAI_PROVIDER_INIT=FAIL (" + (e instanceof Error ? e.message : String(e)) + ")");
  }
});
