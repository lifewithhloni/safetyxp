import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MockEmailProvider } from "./providers/mock.provider";
import { renderSafetyXpEmailTemplate, validateProductionEmailEnvironment } from "./email.service";
import { ResendProvider } from "./providers/resend.provider";

const originalEnv = { ...process.env };

describe("email providers and templates", () => {
  beforeEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    (process.env as Record<string, string | undefined>).EMAIL_PROVIDER = "mock";
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });
  it("renders a branded template without sensitive url parameters", () => {
    const rendered = renderSafetyXpEmailTemplate({
      heading: "Your SafetyXP mission is ready",
      greeting: "Good morning, John.",
      message: "Today's mission is available.",
      ctaLabel: "Continue Learning",
      ctaUrl: "https://app.example.com/today",
    });

    expect(rendered.html).toContain("SafetyXP");
    expect(rendered.html).not.toContain("token=");
  });

  it("mock provider sends successfully", async () => {
    const provider = new MockEmailProvider();
    const result = await provider.send({ to: "employee@example.com", subject: "Subject", html: "<p>Hello</p>", text: "Hello" });
    expect(result.success).toBe(true);
  });

  it("resend provider fails safely when configuration is missing", () => {
    expect(() => new ResendProvider("", "")).toThrow("RESEND_API_KEY is not configured.");
  });

  it("passes production validation when all required values exist", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).EMAIL_PROVIDER = "resend";
    (process.env as Record<string, string | undefined>).RESEND_API_KEY = "test-key";
    (process.env as Record<string, string | undefined>).RESEND_FROM_EMAIL = "alerts@company.com";

    expect(() => validateProductionEmailEnvironment()).not.toThrow();
  });

  it("fails production validation when EMAIL_PROVIDER is mock", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).EMAIL_PROVIDER = "mock";
    (process.env as Record<string, string | undefined>).RESEND_API_KEY = "test-key";
    (process.env as Record<string, string | undefined>).RESEND_FROM_EMAIL = "alerts@company.com";

    expect(() => validateProductionEmailEnvironment()).toThrow(/EMAIL_PROVIDER must be set to "resend"/);
  });

  it("fails production validation when RESEND_API_KEY is missing", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).EMAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;
    (process.env as Record<string, string | undefined>).RESEND_FROM_EMAIL = "alerts@company.com";

    expect(() => validateProductionEmailEnvironment()).toThrow(/RESEND_API_KEY/);
  });

  it("fails production validation when RESEND_FROM_EMAIL is missing", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).EMAIL_PROVIDER = "resend";
    (process.env as Record<string, string | undefined>).RESEND_API_KEY = "test-key";
    delete process.env.RESEND_FROM_EMAIL;

    expect(() => validateProductionEmailEnvironment()).toThrow(/RESEND_FROM_EMAIL/);
  });

  it("rejects onboarding@resend.dev in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).EMAIL_PROVIDER = "resend";
    (process.env as Record<string, string | undefined>).RESEND_API_KEY = "test-key";
    (process.env as Record<string, string | undefined>).RESEND_FROM_EMAIL = "onboarding@resend.dev";

    expect(() => validateProductionEmailEnvironment()).toThrow(/onboarding@resend.dev/);
  });

  it("leaves development/test configuration unaffected", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    expect(() => validateProductionEmailEnvironment()).not.toThrow();
  });
});
