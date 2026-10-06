import { beforeEach, describe, expect, it, jest } from "@jest/globals";

class MockCronAuthError extends Error {}

const requireCronSecretMock = jest.fn((request: Request) => {
  if (request.headers.get("x-cron-secret") !== "valid-cron-secret") {
    throw new MockCronAuthError("Invalid cron secret.");
  }
});
const executeCronJobMock = jest.fn(async (_jobName: string, task: () => Promise<unknown>) => task());
const reportCronJobFailureMock = jest.fn();

jest.mock("@/services/automation/scheduler.service", () => ({
  executeCronJob: executeCronJobMock,
  isCronAuthError: (error: unknown) => error instanceof MockCronAuthError,
  reportCronJobFailure: reportCronJobFailureMock,
  requireCronSecret: requireCronSecretMock,
}));

jest.mock("@/services/automation/automation.service", () => ({
  processCertificateExpiry: jest.fn<() => Promise<unknown>>().mockResolvedValue({ sent: 0 }),
  processDailyMissions: jest.fn<() => Promise<unknown>>().mockResolvedValue({ sent: 0 }),
  processDeadlineReminders: jest.fn<() => Promise<unknown>>().mockResolvedValue({ sent: 0 }),
  processNotificationQueue: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
  processRiskAlerts: jest.fn<() => Promise<unknown>>().mockResolvedValue({ sent: 0 }),
  processWeeklySummaries: jest.fn<() => Promise<unknown>>().mockResolvedValue({ sent: 0 }),
}));

import { POST as certificateExpiry } from "@/app/api/cron/certificate-expiry/route";
import { POST as dailyMissions } from "@/app/api/cron/daily-missions/route";
import { POST as deadlineReminders } from "@/app/api/cron/deadline-reminders/route";
import { POST as processNotifications } from "@/app/api/cron/process-notifications/route";
import { POST as riskAnalysis } from "@/app/api/cron/risk-analysis/route";
import { POST as weeklySummary } from "@/app/api/cron/weekly-summary/route";

type CronHandler = (request: Request) => Promise<Response>;

const routes: Array<{ jobName: string; handler: CronHandler }> = [
  { jobName: "certificate-expiry", handler: certificateExpiry },
  { jobName: "daily-missions", handler: dailyMissions },
  { jobName: "deadline-reminders", handler: deadlineReminders },
  { jobName: "process-notifications", handler: processNotifications },
  { jobName: "risk-analysis", handler: riskAnalysis },
  { jobName: "weekly-summary", handler: weeklySummary },
];

function cronRequest(secret?: string) {
  return new Request("https://example.test/api/cron/test", {
    method: "POST",
    headers: secret ? { "x-cron-secret": secret } : undefined,
  });
}

describe("cron route handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCronSecretMock.mockImplementation((request: Request) => {
      if (request.headers.get("x-cron-secret") !== "valid-cron-secret") {
        throw new MockCronAuthError("Invalid cron secret.");
      }
    });
    executeCronJobMock.mockImplementation(async (_jobName: string, task: () => Promise<unknown>) => task());
  });

  it.each(routes)("returns 403 without a valid secret for $jobName without reporting to Sentry", async ({ handler }) => {
    const response = await handler(cronRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Forbidden." });
    expect(executeCronJobMock).not.toHaveBeenCalled();
    expect(reportCronJobFailureMock).not.toHaveBeenCalled();
  });

  it.each(routes)("authenticates and reaches execution for $jobName", async ({ jobName, handler }) => {
    const response = await handler(cronRequest("valid-cron-secret"));

    expect(response.status).toBe(200);
    expect(executeCronJobMock).toHaveBeenCalledWith(jobName, expect.any(Function));
    expect(reportCronJobFailureMock).not.toHaveBeenCalled();
  });

  it("returns the existing success response without reporting to Sentry", async () => {
    executeCronJobMock.mockResolvedValueOnce({ sent: 1, processed: 1 });

    const response = await dailyMissions(cronRequest("valid-cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, result: { sent: 1, processed: 1 } });
    expect(reportCronJobFailureMock).not.toHaveBeenCalled();
  });

  it("returns a safe 500 and reports an unexpected job failure exactly once", async () => {
    const failure = new Error("database operation failed");
    executeCronJobMock.mockRejectedValueOnce(failure);

    const response = await dailyMissions(cronRequest("valid-cron-secret"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Cron job failed." });
    expect(reportCronJobFailureMock).toHaveBeenCalledTimes(1);
    expect(reportCronJobFailureMock).toHaveBeenCalledWith(failure, "daily-missions");
    expect(reportCronJobFailureMock.mock.calls[0]).toHaveLength(2);
  });

  it("returns an expected lock skip result without reporting to Sentry", async () => {
    executeCronJobMock.mockResolvedValueOnce({ skipped: true, jobName: "daily-missions", status: "skipped" });

    const response = await dailyMissions(cronRequest("valid-cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: { skipped: true, jobName: "daily-missions", status: "skipped" },
    });
    expect(reportCronJobFailureMock).not.toHaveBeenCalled();
  });
});