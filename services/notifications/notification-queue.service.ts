import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/security/sentry-server";
import { sendTemplatedEmail } from "@/services/email/email.service";
import { canSendNotificationChannel, getNotificationPreferencesFromDb } from "@/services/notifications/notification-preferences.service";
import type { NotificationEvent, NotificationPriority } from "@/types/notifications";

export type QueueableNotification = {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: "IN_APP" | "EMAIL";
  status: "pending" | "sent" | "read" | "failed";
  read_at: string | null;
  created_at: string;
};

function buildIdempotencyKey(notificationId: string, recipient: string, channel: string) {
  return `${notificationId}:${recipient}:${channel}`;
}

export async function enqueueNotificationDelivery(input: {
  notificationId: string;
  companyId: string;
  recipient: string;
  channel: "IN_APP" | "EMAIL";
  provider: string;
}) {
  const idempotencyKey = buildIdempotencyKey(input.notificationId, input.recipient, input.channel);
  const existing = await supabaseAdmin
    .from("notification_deliveries")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing.data) {
    return existing.data;
  }

  const { data, error } = await supabaseAdmin
    .from("notification_deliveries")
    .insert({
      notification_id: input.notificationId,
      company_id: input.companyId,
      recipient: input.recipient,
      channel: input.channel,
      provider: input.provider,
      status: "QUEUED",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function processNotificationQueue(maxRetries = 3) {
  const { data: deliveries, error } = await supabaseAdmin
    .from("notification_deliveries")
    .select(`
      id,
      notification_id,
      company_id,
      recipient,
      channel,
      provider,
      status,
      attempts,
      notifications(id, title, message, user_id)
    `)
    .in("status", ["QUEUED", "FAILED"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const results = [] as Array<{ id: string; status: string }>;

  for (const delivery of deliveries ?? []) {
    const attempts = Number((delivery as { attempts?: number }).attempts ?? 0);
    if (attempts >= maxRetries) {
      await supabaseAdmin
        .from("notification_deliveries")
        .update({ status: "FAILED", updated_at: new Date().toISOString(), failed_at: new Date().toISOString(), error_code: "MAX_RETRIES" })
        .eq("id", (delivery as { id: string }).id);
      reportServerError(new Error("Notification delivery retry limit reached."), {
        component: "notification_queue",
        operation: "deliver_notification",
        channel: "email",
        outcome: "failed",
        error_code: "MAX_RETRIES",
        failure_scope: "delivery",
      });
      results.push({ id: (delivery as { id: string }).id, status: "FAILED" });
      continue;
    }

    if ((delivery as { channel: string }).channel !== "EMAIL") {
      await supabaseAdmin
        .from("notification_deliveries")
        .update({ status: "DELIVERED", delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", (delivery as { id: string }).id);
      results.push({ id: (delivery as { id: string }).id, status: "DELIVERED" });
      continue;
    }

    const notification = (delivery as { notifications?: { title: string; message: string } | { title: string; message: string }[] }).notifications;
    const row = Array.isArray(notification) ? notification[0] : notification;
    const sendingAt = new Date().toISOString();
    await supabaseAdmin
      .from("notification_deliveries")
      .update({ status: "SENDING", attempts: attempts + 1, updated_at: sendingAt })
      .eq("id", (delivery as { id: string }).id);

    const sendResult = await sendTemplatedEmail({
      to: (delivery as { recipient: string }).recipient,
      heading: row?.title ?? "SafetyXP notification",
      message: row?.message ?? "You have an important SafetyXP update.",
      ctaLabel: "Open SafetyXP",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/today`,
    });

    const nextStatus = sendResult.success ? "SENT" : sendResult.invalidRecipient ? "CANCELLED" : attempts + 1 >= maxRetries ? "FAILED" : "FAILED";
    await supabaseAdmin
      .from("notification_deliveries")
      .update({
        status: nextStatus,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        delivered_at: sendResult.success ? new Date().toISOString() : null,
        failed_at: sendResult.success ? null : new Date().toISOString(),
        error_code: sendResult.success ? null : sendResult.reason ?? "DELIVERY_FAILED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", (delivery as { id: string }).id);

    if (!sendResult.success) {
      reportServerError(new Error("Notification delivery failed."), {
        component: "notification_queue",
        operation: "deliver_notification",
        channel: "email",
        provider: (delivery as { provider: string }).provider === "resend" ? "resend" : "mock",
        outcome: nextStatus.toLowerCase(),
        error_code: sendResult.invalidRecipient ? "INVALID_RECIPIENT" : "DELIVERY_FAILED",
        attempt: attempts + 1,
      });
    }

    results.push({ id: (delivery as { id: string }).id, status: nextStatus });
  }

  return results;
}

export async function queueNotificationEvent(event: NotificationEvent, channel: "IN_APP" | "EMAIL", recipientEmail?: string) {
  if (!event.payload.userId) {
    throw new Error("Notification event is missing a recipient user.");
  }

  const preferences = await getNotificationPreferencesFromDb(event.payload.userId);
  if (!canSendNotificationChannel(preferences, event.eventType, channel)) {
    return { id: "skipped", company_id: event.companyId };
  }

  const idempotencyKey = `${event.id}:${channel}:${event.payload.userId ?? ""}`;
  const existing = await supabaseAdmin
    .from("notifications")
    .select("id, company_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  const notificationRecord = existing.data
    ? existing
    : await supabaseAdmin
        .from("notifications")
        .insert({
          company_id: event.companyId,
          user_id: event.payload.userId,
          type: event.eventType,
          title: String(event.payload.title ?? event.eventType),
          message: String(event.payload.body ?? "SafetyXP notification."),
          priority: String((event.payload.priority as string | undefined)?.toLowerCase?.() ?? "normal"),
          channel,
          status: "pending",
          idempotency_key: idempotencyKey,
        })
        .select("id, company_id")
        .single();

  const { data, error } = notificationRecord;

  if (error || !data) {
    throw new Error(error?.message || "Failed to queue notification.");
  }

  if (channel === "EMAIL" && recipientEmail) {
    await enqueueNotificationDelivery({
      notificationId: data.id,
      companyId: data.company_id,
      recipient: recipientEmail,
      channel,
      provider: process.env.EMAIL_PROVIDER === "resend" ? "resend" : "mock",
    });
  }

  return data;
}
