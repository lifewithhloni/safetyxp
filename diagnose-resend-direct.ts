/**
 * Direct Resend API authentication test
 * Tests the API key with minimal code to isolate the issue.
 * Does NOT use SafetyXP's ResendProvider wrapper.
 */
import * as nextEnv from "@next/env";
import { resolve } from "path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

nextEnv.loadEnvConfig(resolve("."), false);

async function resolveRecipient(): Promise<string> {
  const fromEnv = (process.env.DIAGNOSTIC_TO_EMAIL || "").trim();
  if (fromEnv) {
    console.log(`✓ Recipient: ${fromEnv} (from DIAGNOSTIC_TO_EMAIL)`);
    return fromEnv;
  }
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("Enter recipient email for diagnostic test: ");
  rl.close();
  return answer.trim();
}

async function diagnoseResendDirect() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  console.log("=== Direct Resend API Diagnostic ===\n");

  if (!apiKey) {
    console.log("❌ RESEND_API_KEY is not set in environment");
    process.exit(1);
  }
  if (!fromEmail) {
    console.log("❌ RESEND_FROM_EMAIL is not set in environment");
    process.exit(1);
  }

  console.log("✓ API key loaded from environment");
  console.log(`✓ Sender: ${fromEmail}`);
  console.log();

  const toEmail = await resolveRecipient();
  if (!toEmail || !toEmail.includes("@")) {
    console.log("❌ No valid recipient email provided");
    process.exit(1);
  }

  try {
    // Test 1: Direct HTTP request (no SDK wrapper)
    console.log("\nTEST 1: Direct HTTP to Resend API...");
    const directResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: "SafetyXP Resend Diagnostic",
        html: "<p>This is a Resend API diagnostic test from SafetyXP.</p>",
      }),
    });

    const directData = await directResponse.json() as Record<string, unknown>;

    if (directResponse.status === 401) {
      console.log("❌ API key authentication: FAIL (HTTP 401 - API key is invalid)");
      console.log(`   Error: ${JSON.stringify(directData)}`);
      process.exit(1);
    } else if (directResponse.ok) {
      const id = (directData as { id?: string }).id;
      console.log("✓ API key authentication: PASS");
      console.log("✓ Sender: PASS");
      console.log("✓ Recipient validation: PASS");
      console.log(`✓ Email accepted by Resend (ID: ${id})`);
    } else {
      console.log(`⚠️  HTTP ${directResponse.status}: ${JSON.stringify(directData)}`);
    }

    // Test 2: SDK path (matches SafetyXP ResendProvider exactly)
    console.log("\nTEST 2: Resend SDK (mirrors SafetyXP ResendProvider)...");
    const { Resend } = await import("resend");
    const client = new Resend(apiKey);
    const sdkResponse = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: "SafetyXP SDK Diagnostic",
      html: "<p>This is an SDK diagnostic test from SafetyXP.</p>",
    });

    if (sdkResponse.error) {
      console.log(`❌ SDK error: ${sdkResponse.error.message}`);
      console.log(`   Details: ${JSON.stringify(sdkResponse.error)}`);
      process.exit(1);
    } else if (sdkResponse.data?.id) {
      console.log(`✓ SDK authenticated and accepted (ID: ${sdkResponse.data.id})`);
      console.log("\nRESULT: Resend is fully operational. Ready for npm run provision-company.");
      process.exit(0);
    } else {
      console.log(`⚠️  Unexpected SDK response: ${JSON.stringify(sdkResponse)}`);
    }
  } catch (error) {
    console.log(`❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

diagnoseResendDirect();
