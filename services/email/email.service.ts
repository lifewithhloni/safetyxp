import type { EmailProvider } from "@/services/email/email-provider";
import { MockEmailProvider } from "@/services/email/providers/mock.provider";
import { ResendProvider } from "@/services/email/providers/resend.provider";

export type EmailTemplateInput = {
  heading: string;
  greeting?: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
  companyName?: string;
};

export function validateProductionEmailEnvironment() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const provider = (process.env.EMAIL_PROVIDER ?? "").trim();
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const errors: string[] = [];

  if (provider !== "resend") {
    errors.push('EMAIL_PROVIDER must be set to "resend" in production.');
  }

  if (!apiKey) {
    errors.push("Missing required production environment variable: RESEND_API_KEY.");
  }

  if (!fromEmail) {
    errors.push("Missing required production environment variable: RESEND_FROM_EMAIL.");
  }

  if (fromEmail && fromEmail.toLowerCase() === "onboarding@resend.dev") {
    errors.push("RESEND_FROM_EMAIL cannot use onboarding@resend.dev in production; use a verified production sender address.");
  }

  if (errors.length > 0) {
    throw new Error(`Production email configuration error: ${errors.join(" ")}`);
  }
}

export function getEmailProvider(): EmailProvider {
  validateProductionEmailEnvironment();
  const provider = process.env.EMAIL_PROVIDER === "resend" ? "resend" : "mock";
  return provider === "resend" ? new ResendProvider() : new MockEmailProvider();
}

export function renderSafetyXpEmailTemplate(input: EmailTemplateInput) {
  const footer = input.footer ?? "SafetyXP compliance notifications";
  const companyName = input.companyName ?? "SafetyXP";
  const ctaHtml = input.ctaLabel && input.ctaUrl
    ? `<p style=\"margin:24px 0;\"><a href=\"${input.ctaUrl}\" style=\"background:#0b3d91;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:600;\">${input.ctaLabel}</a></p>`
    : "";

  return {
    subject: input.heading,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:32px;">
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#0b3d91;">${companyName}</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">${input.heading}</h1>
          ${input.greeting ? `<p style="margin:0 0 12px;">${input.greeting}</p>` : ""}
          <p style="margin:0 0 12px;line-height:1.6;">${input.message}</p>
          ${ctaHtml}
          <p style="margin:24px 0 0;font-size:12px;color:#64748b;">${footer}</p>
        </div>
      </div>
    `,
    text: [input.heading, input.greeting ?? "", input.message, input.ctaUrl ?? "", footer].filter(Boolean).join("\n\n"),
  };
}

export async function sendTemplatedEmail(input: {
  to: string;
  heading: string;
  greeting?: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
  companyName?: string;
}) {
  const provider = getEmailProvider();
  const email = renderSafetyXpEmailTemplate(input);
  return provider.send({
    to: input.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
