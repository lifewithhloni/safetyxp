import { createServerSupabaseClient } from "@/lib/supabase/server";
import { queueNotificationEvent } from "@/services/notifications/notification-queue.service";
import type { Notification, NotificationProviderResponse, NotificationEvent } from "@/types/notifications";
import { getNotificationTemplate } from "@/services/notifications/notification-template.service";
import { getNotificationPreferences } from "@/services/notifications/notification-preferences.service";

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

export async function getNotificationsForUser(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, company_id, user_id, type, title, message, priority, channel, status, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((item) => ({
    id: item.id,
    companyId: item.company_id,
    userId: item.user_id,
    eventId: item.id,
    eventType: item.type as NotificationEvent["eventType"],
    title: item.title,
    body: item.message,
    channel: item.channel as NotificationProviderResponse["channel"],
    status: item.status.toUpperCase() as Notification["status"],
    priority: item.priority.toUpperCase() as Notification["priority"],
    isRead: Boolean(item.read_at),
    createdAt: item.created_at,
    updatedAt: item.created_at,
  }));
}

export async function getUnreadNotifications(userId: string) {
  const notifications = await getNotificationsForUser(userId);
  return notifications.filter((notification) => !notification.isRead);
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .select("id")
    .maybeSingle();

  return data;
}

export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");

  return data ?? [];
}

export async function sendNotification(event: NotificationEvent, channel: NotificationProviderResponse["channel"] = "IN_APP") {
  const notification = buildNotification(event, channel);
  const recipientEmail = typeof event.payload.email === "string" ? event.payload.email : undefined;
  const queued = await queueNotificationEvent(event, channel as "IN_APP" | "EMAIL", recipientEmail);
  return { notification: { ...notification, id: queued.id }, response: { success: true, provider: channel === "EMAIL" ? "queue" : "in-app", channel, timestamp: new Date().toISOString() } };
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
