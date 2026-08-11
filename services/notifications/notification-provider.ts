import type { Notification, NotificationChannel, NotificationProviderResponse } from "@/types/notifications";

export interface NotificationProvider {
  name: string;
  supportsChannel(channel: NotificationChannel): boolean;
  send(notification: Notification): Promise<NotificationProviderResponse>;
}
