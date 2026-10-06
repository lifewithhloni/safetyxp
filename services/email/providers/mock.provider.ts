import type { EmailProvider, EmailSendInput, EmailSendResult } from "@/services/email/email-provider";

export class MockEmailProvider implements EmailProvider {
  readonly name = "MockEmailProvider";

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    return {
      success: true,
      provider: this.name,
      messageId: `mock-${Date.now()}`,
      reason: input.to.includes("@") ? undefined : "Invalid recipient",
      invalidRecipient: !input.to.includes("@"),
    };
  }
}
