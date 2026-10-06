import { supabaseAdmin } from "@/lib/supabase/admin";

export type AiUsageRecord = {
  companyId: string;
  userId: string;
  policyId: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
};

export function estimateAiCost(inputTokens: number, outputTokens: number) {
  const estimatedInputUsd = inputTokens * 0.0000005;
  const estimatedOutputUsd = outputTokens * 0.0000015;
  return Number((estimatedInputUsd + estimatedOutputUsd).toFixed(6));
}

export async function recordAiUsage(record: AiUsageRecord) {
  const { error } = await supabaseAdmin.from("ai_usage_records").insert({
    company_id: record.companyId,
    user_id: record.userId,
    policy_id: record.policyId,
    operation: record.operation,
    model: record.model,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    estimated_cost: record.estimatedCost,
  });

  if (error) {
    throw new Error(`Failed to record AI usage: ${error.message}`);
  }
}
