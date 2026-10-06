import * as nextEnv from "@next/env";
import { resolve } from "path";

// Load environment variables from .env.local
nextEnv.loadEnvConfig(resolve("."), false);

async function testResendAuth() {
  console.log("Testing Resend API authentication...");

  if (!process.env.RESEND_API_KEY) {
    console.log("❌ RESEND_API_KEY is not set");
    process.exit(1);
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    console.log("❌ RESEND_FROM_EMAIL is not set");
    process.exit(1);
  }

  console.log("✓ RESEND_API_KEY is set");
  console.log("✓ RESEND_FROM_EMAIL is set");

  try {
    const { Resend } = await import("resend");
    const client = new Resend(process.env.RESEND_API_KEY);

    console.log("✓ Resend client instantiated successfully");

    // Test by attempting to send to a test address
    // The actual error from Resend API will tell us if the key is valid
    const response = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: "test@example.com",
      subject: "Authentication Test",
      html: "<p>Testing Resend API key validity</p>",
    });

    if (response.error) {
      console.log(`⚠️  Resend API returned error: ${response.error.message}`);
      console.log(`    This indicates: ${JSON.stringify(response.error)}`);
      process.exit(1);
    } else if (response.data?.id) {
      console.log(`✓ Email accepted by Resend (ID: ${response.data.id})`);
      console.log("  API key is valid and configured correctly");
      process.exit(0);
    } else {
      console.log("⚠️  Unexpected response from Resend API");
      console.log(`    ${JSON.stringify(response)}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(
      `❌ Exception: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

testResendAuth();
