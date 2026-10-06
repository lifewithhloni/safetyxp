export type EmailProvider = {
  sendInvitation: (params: { to: string; companyName: string; invitationUrl: string; employeeName: string }) => Promise<{ queued: boolean; messageId?: string }>;
};

export class InvitationEmailProvider implements EmailProvider {
  async sendInvitation({ to, companyName, invitationUrl, employeeName }: { to: string; companyName: string; invitationUrl: string; employeeName: string }) {
    console.info("Invitation email queued", {
      to,
      companyName,
      employeeName,
      invitationUrl: invitationUrl.replace(/token=[^&]+/, "token=[REDACTED]"),
    });

    return { queued: true, messageId: `invite-${Date.now()}` };
  }
}

export class MockInvitationEmailProvider extends InvitationEmailProvider {}
