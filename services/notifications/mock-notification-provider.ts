import type { Notification, NotificationProviderResponse } from "@/types/notifications";
import type { NotificationProvider } from "@/services/notifications/notification-provider";

export class MockNotificationProvider implements NotificationProvider {
  readonly name = "MockNotificationProvider";

  supportsChannel(): boolean {
    return true;
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
