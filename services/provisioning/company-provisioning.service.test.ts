import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import { buildAdminInvitationEmail, sendAdminInvitationEmail, validateProvisioningInput } from "./company-provisioning.service";
import { sendTemplatedEmail } from "@/services/email/email.service";

jest.mock("@/services/email/email.service", () => ({
  sendTemplatedEmail: jest.fn(),
}));

describe("company provisioning helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it("normalizes valid provisioning input", () => {
    const result = validateProvisioningInput({
      companyName: "  Example Mining Ltd  ",
      industry: " Mining ",
      adminFirstName: " Jane ",
      adminLastName: " Smith ",
      adminEmail: " JANE@EXAMPLE.COM ",
      timezone: "Africa/Johannesburg",
      logoUrl: "https://example.com/logo.png",
    });

    expect(result.ok).toBe(true);
    expect(result.value.companyName).toBe("Example Mining Ltd");
    expect(result.value.adminEmail).toBe("jane@example.com");
  });

  it("rejects invalid provisioning input", () => {
    const result = validateProvisioningInput({
      companyName: "",
      industry: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "not-an-email",
      timezone: "Invalid/Zone",
      logoUrl: "ftp://example.com/logo.png",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("builds a safe admin invitation email without secrets", () => {
    const email = buildAdminInvitationEmail({
      companyName: "Example Mining Ltd",
      adminFirstName: "Jane",
      adminEmail: "jane@example.com",
      actionLink: "https://example.com/auth/confirm?token_hash=redacted",
    });

    expect(email.heading).toContain("SafetyXP");
    expect(email.message).toContain("Example Mining Ltd");
    expect(email.ctaUrl).toContain("auth/confirm");
  });

  const mockedSendTemplatedEmail = sendTemplatedEmail as jest.MockedFunction<typeof sendTemplatedEmail>;

  it("surfaces admin invitation email delivery failure clearly", async () => {
    mockedSendTemplatedEmail.mockResolvedValue({
      success: false,
      provider: "mock",
      reason: "Delivery failed.",
    } as Awaited<ReturnType<typeof sendTemplatedEmail>>);

    await expect(sendAdminInvitationEmail({
      companyName: "Example Mining Ltd",
      adminFirstName: "Jane",
      adminEmail: "jane@example.com",
      actionLink: "https://example.com/auth/confirm",
    })).rejects.toThrow("Delivery failed.");

    expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
  });

  it("keeps successful admin invitation behavior unchanged", async () => {
    mockedSendTemplatedEmail.mockResolvedValue({
      success: true,
      provider: "resend",
      messageId: "msg-123",
    } as Awaited<ReturnType<typeof sendTemplatedEmail>>);

    await expect(sendAdminInvitationEmail({
      companyName: "Example Mining Ltd",
      adminFirstName: "Jane",
      adminEmail: "jane@example.com",
      actionLink: "https://example.com/auth/confirm",
    })).resolves.toEqual({ provider: "resend" });

    expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "jane@example.com",
      heading: "You've been invited to manage SafetyXP",
    }));
  });
});
