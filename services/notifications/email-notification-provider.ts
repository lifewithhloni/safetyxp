import type { Notification, NotificationProviderResponse } from "@/types/notifications";
import type { NotificationProvider } from "@/services/notifications/notification-provider";

const emailProviderKey = process.env.EMAIL_PROVIDER_API_KEY ?? "";

export class EmailNotificationProvider implements NotificationProvider {
  readonly name = "EmailNotificationProvider";

  supportsChannel(channel: string) {
    return channel === "EMAIL";
  }

  async send(notification: Notification): Promise<NotificationProviderResponse> {
    if (!emailProviderKey) {
      return {
        success: false,
        provider: this.name,
        channel: notification.channel,
        timestamp: new Date().toISOString(),
        reason: "Email provider is not configured.",
      };
    }

    return {
      success: true,
      provider: this.name,
      channel: notification.channel,
      timestamp: new Date().toISOString(),
    };
  }
}
