import type { Notification, NotificationProviderResponse, NotificationEvent } from "@/types/notifications";
import { getNotificationTemplate } from "@/services/notifications/notification-template.service";
import { getNotificationPreferences } from "@/services/notifications/notification-preferences.service";
import { MockNotificationProvider } from "@/services/notifications/mock-notification-provider";

const provider = new MockNotificationProvider();
const notificationStore: Notification[] = [];

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function getDefaultChannel(eventType: NotificationEvent["eventType"]): string[] {
  const template = getNotificationTemplate(eventType);
  return template?.defaultChannels ?? ["IN_APP"];
}

function buildNotification(event: NotificationEvent, channel: NotificationProviderResponse["channel"]): Notification {
  const template = getNotificationTemplate(event.eventType);
  const title = event.payload.title || template?.title || event.eventType;
  const body = event.payload.body || template?.body || "You have an important update.";

  return {
    id: generateId("notif"),
    companyId: event.companyId,
    userId: event.payload.userId ?? "",
    eventId: event.id,
    eventType: event.eventType,
    title,
    body,
    channel,
    status: "PENDING",
    priority: template?.priority ?? "NORMAL",
    isRead: false,
    actionUrl: event.payload.actionUrl ? String(event.payload.actionUrl) : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { ...event.payload },
  };
}

export function getNotificationsForUser(userId: string) {
  return notificationStore.filter((notification) => notification.userId === userId);
}

export function getUnreadNotifications(userId: string) {
  return notificationStore.filter((notification) => notification.userId === userId && !notification.isRead);
}

export function markNotificationAsRead(notificationId: string) {
  const notification = notificationStore.find((item) => item.id === notificationId);
  if (!notification) {
    return null;
  }
  notification.isRead = true;
  notification.status = "READ";
  notification.updatedAt = new Date().toISOString();
  return notification;
}

export function markAllNotificationsAsRead(userId: string) {
  const notifications = notificationStore.filter((item) => item.userId === userId && !item.isRead);
  notifications.forEach((notification) => {
    notification.isRead = true;
    notification.status = "READ";
    notification.updatedAt = new Date().toISOString();
  });
  return notifications;
}

export async function sendNotification(event: NotificationEvent, channel: NotificationProviderResponse["channel"] = "IN_APP") {
  const notification = buildNotification(event, channel);
  const response = await provider.send(notification);

  notification.status = response.success ? "SENT" : "FAILED";
  notification.updatedAt = new Date().toISOString();
  notificationStore.push(notification);

  return { notification, response };
}

export function createNotificationsForEvent(event: NotificationEvent) {
  const channels = getDefaultChannel(event.eventType) as Array<"IN_APP" | "EMAIL">;
  const preferences = event.payload.userId ? getNotificationPreferences(event.payload.userId) : null;
  const selectedChannels = preferences
    ? channels.filter((channel) => preferences.channels.includes(channel as "IN_APP" | "EMAIL"))
    : channels;

  return Promise.all(selectedChannels.map((channel) => sendNotification(event, channel)));
}

export function createNotificationAuditRecord(notificationId: string, event: NotificationEvent, channel: NotificationProviderResponse["channel"], status: Notification["status"], reason?: string) {
  return {
    id: generateId("audit"),
    notificationId,
    eventId: event.id,
    userId: event.payload.userId ?? "",
    companyId: event.companyId,
    type: event.eventType,
    channel,
    createdAt: new Date().toISOString(),
    status,
    reason,
  };
}
