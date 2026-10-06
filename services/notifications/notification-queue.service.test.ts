import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { EmailSendResult } from "@/services/email/email-provider";

const from = jest.fn();
const sendTemplatedEmail = jest.fn<() => Promise<EmailSendResult>>();
const reportServerError = jest.fn();

jest.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));
jest.mock("@/services/email/email.service", () => ({ sendTemplatedEmail }));
jest.mock("@/lib/security/sentry-server", () => ({ reportServerError }));
jest.mock("@/services/notifications/notification-preferences.service", () => ({
  canSendNotificationChannel: jest.fn(),
  getNotificationPreferencesFromDb: jest.fn(),
}));

import { enqueueNotificationDelivery, processNotificationQueue } from "./notification-queue.service";

const recipient = "employee@example.test";
const title = "Sensitive notification title";
const message = "Sensitive notification body";
const actionUrl = "https://app.example.test/today";

function delivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    notification_id: "notification-1",
    company_id: "company-1",
    recipient,
    channel: "EMAIL",
    provider: "resend",
    status: "QUEUED",
    attempts: 0,
    notifications: { id: "notification-1", title, message, user_id: "user-1" },
    ...overrides,
  };
}

function mockQueue(deliveries: Record<string, unknown>[]) {
  const order = jest.fn<() => Promise<{ data: Record<string, unknown>[]; error: null }>>().mockResolvedValue({ data: deliveries, error: null });
  const inFilter = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ in: inFilter });
  const updates: Record<string, unknown>[] = [];
  const update = jest.fn((values: Record<string, unknown>) => {
    updates.push(values);
    return { eq: jest.fn<() => Promise<{ error: null }>>().mockResolvedValue({ error: null }) };
  });
  from.mockReturnValue({ select, update });
  return { inFilter, updates };
}

describe("notification queue behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delivers an eligible queued email and does not report an error", async () => {
    const queue = mockQueue([delivery()]);
    sendTemplatedEmail.mockResolvedValue({ success: true, provider: "ResendProvider", messageId: "message-1" });

    await expect(processNotificationQueue()).resolves.toEqual([{ id: "delivery-1", status: "SENT" }]);

    expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
    expect(queue.updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "SENDING", attempts: 1 }),
      expect.objectContaining({ status: "SENT" }),
    ]));
    expect(reportServerError).not.toHaveBeenCalled();
  });

  it("persists a retryable provider failure and reports it once with sanitized metadata", async () => {
    const queue = mockQueue([delivery()]);
    sendTemplatedEmail.mockResolvedValue({ success: false, provider: "ResendProvider", reason: `Failed for ${recipient}`, invalidRecipient: false });

    await expect(processNotificationQueue()).resolves.toEqual([{ id: "delivery-1", status: "FAILED" }]);

    expect(queue.updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "SENDING", attempts: 1 }),
      expect.objectContaining({ status: "FAILED", error_code: `Failed for ${recipient}` }),
    ]));
    expect(reportServerError).toHaveBeenCalledTimes(1);
    expect(reportServerError).toHaveBeenCalledWith(expect.any(Error), {
      component: "notification_queue",
      operation: "deliver_notification",
      channel: "email",
      provider: "resend",
      outcome: "failed",
      error_code: "DELIVERY_FAILED",
      attempt: 1,
    });
  });

  it("cancels an invalid recipient without sending sensitive delivery data to Sentry", async () => {
    const queue = mockQueue([delivery()]);
    sendTemplatedEmail.mockResolvedValue({ success: false, provider: "ResendProvider", reason: "Invalid recipient", invalidRecipient: true });

    await expect(processNotificationQueue()).resolves.toEqual([{ id: "delivery-1", status: "CANCELLED" }]);

    expect(queue.updates).toEqual(expect.arrayContaining([expect.objectContaining({ status: "CANCELLED" })]));
    expect(reportServerError).toHaveBeenCalledTimes(1);
    const [error, context] = reportServerError.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect(context).toEqual({
      component: "notification_queue",
      operation: "deliver_notification",
      channel: "email",
      provider: "resend",
      outcome: "cancelled",
      error_code: "INVALID_RECIPIENT",
      attempt: 1,
    });
    expect(JSON.stringify(context)).not.toContain(recipient);
    expect(JSON.stringify(context)).not.toContain(title);
    expect(JSON.stringify(context)).not.toContain(message);
    expect(JSON.stringify(context)).not.toContain(actionUrl);
    expect(JSON.stringify(context)).not.toContain("delivery-1");
    expect(JSON.stringify(context)).not.toContain("company-1");
  });

  it("marks an already exhausted delivery failed, does not send email, and reports once", async () => {
    const queue = mockQueue([delivery({ attempts: 3 })]);

    await expect(processNotificationQueue()).resolves.toEqual([{ id: "delivery-1", status: "FAILED" }]);

    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(queue.updates).toEqual([expect.objectContaining({ status: "FAILED", error_code: "MAX_RETRIES" })]);
    expect(reportServerError).toHaveBeenCalledTimes(1);
    expect(reportServerError).toHaveBeenCalledWith(expect.any(Error), {
      component: "notification_queue",
      operation: "deliver_notification",
      channel: "email",
      outcome: "failed",
      error_code: "MAX_RETRIES",
      failure_scope: "delivery",
    });
  });

  it("processes only queued and failed records and does not report an empty queue", async () => {
    const queue = mockQueue([]);

    await expect(processNotificationQueue()).resolves.toEqual([]);

    expect(queue.inFilter).toHaveBeenCalledWith("status", ["QUEUED", "FAILED"]);
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(reportServerError).not.toHaveBeenCalled();
  });

  it("returns an existing delivery instead of inserting a duplicate idempotency key", async () => {
    const maybeSingle = jest.fn<() => Promise<{ data: { id: string }; error: null }>>().mockResolvedValue({ data: { id: "existing-delivery" }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const insert = jest.fn();
    from.mockReturnValue({ select, insert });

    await expect(enqueueNotificationDelivery({
      notificationId: "notification-1",
      companyId: "company-1",
      recipient,
      channel: "EMAIL",
      provider: "resend",
    })).resolves.toEqual({ id: "existing-delivery" });

    expect(insert).not.toHaveBeenCalled();
    expect(reportServerError).not.toHaveBeenCalled();
  });
});
