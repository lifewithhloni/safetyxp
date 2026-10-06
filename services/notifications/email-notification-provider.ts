import type { Notification, NotificationProviderResponse } from "@/types/notifications";
import type { NotificationProvider } from "@/services/notifications/notification-provider";

export class EmailNotificationProvider implements NotificationProvider {
  readonly name = "EmailNotificationProvider";

  supportsChannel(channel: string) {
    return channel === "EMAIL";
  }

  async send(notification: Notification): Promise<NotificationProviderResponse> {
    return {
      success: true,
      provider: this.name,
      channel: notification.channel,
      timestamp: new Date().toISOString(),
    };
  }
}
