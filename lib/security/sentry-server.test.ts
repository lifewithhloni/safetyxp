import { describe, expect, it, jest } from "@jest/globals";

const captureException = jest.fn();
const setTags = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  captureException,
  withScope: (callback: (scope: { setTags: typeof setTags }) => void) => callback({ setTags }),
}));

import { reportServerError } from "./sentry-server";

describe("server Sentry reporting", () => {
  it("captures a sanitized exception with only allowlisted technical tags", () => {
    reportServerError(new Error("recipient@example.com failed with token=secret"), {
      component: "cron",
      job_name: "daily-missions",
      attempt: 2,
      company_id: "not-allowed",
    } as never);

    expect(setTags).toHaveBeenCalledWith({ component: "cron", job_name: "daily-missions", attempt: "2" });
    expect(captureException).toHaveBeenCalledTimes(1);
    const captured = captureException.mock.calls[0]?.[0];

    expect(captured).toBeInstanceOf(Error);
    if (!(captured instanceof Error)) {
      throw new Error("Sentry did not receive an Error instance.");
    }

    expect(captured.message).toBe("SafetyXP cron operation failed.");
    expect(captured.message).not.toContain("recipient@example.com");
    expect(captured.message).not.toContain("secret");
  });
});