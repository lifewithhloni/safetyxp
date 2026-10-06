import { Resend } from "resend";
import type { EmailProvider, EmailSendInput, EmailSendResult } from "@/services/email/email-provider";

export class ResendProvider implements EmailProvider {
  readonly name = "ResendProvider";
  private readonly client: Resend;
  private readonly fromEmail: string;

  constructor(apiKey = process.env.RESEND_API_KEY, fromEmail = process.env.RESEND_FROM_EMAIL) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    if (!fromEmail) {
      throw new Error("RESEND_FROM_EMAIL is not configured.");
    }

    this.client = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      return {
        success: true,
        provider: this.name,
        messageId: response.data?.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed.";
      return {
        success: false,
        provider: this.name,
        reason: message,
        invalidRecipient: /invalid|recipient|email/i.test(message),
      };
    }
  }
}
