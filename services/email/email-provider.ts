export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult = {
  success: boolean;
  provider: string;
  messageId?: string;
  reason?: string;
  invalidRecipient?: boolean;
};

export interface EmailProvider {
  name: string;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
