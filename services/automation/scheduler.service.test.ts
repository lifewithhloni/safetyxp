import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { acquireCronLock, executeCronJob, getDaysUntil, releaseCronLock, requireCronSecret, startOfCompanyDay } from "./scheduler.service";
import { supabaseAdmin } from "@/lib/supabase/admin";

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: jest.fn() } as Record<string, unknown>,
}));

describe("scheduler helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rejects invalid cron secret", () => {
    process.env.CRON_SECRET = "secret";
    const request = new Request("https://example.com", { headers: { "x-cron-secret": "wrong" } });
    expect(() => requireCronSecret(request)).toThrow("Invalid cron secret.");
  });

  it("accepts valid cron secret", () => {
    process.env.CRON_SECRET = "secret";
    const request = new Request("https://example.com", { headers: { "x-cron-secret": "secret" } });
    expect(() => requireCronSecret(request)).not.toThrow();
  });

  it("computes company-local day and days until target", () => {
    const day = startOfCompanyDay(new Date("2026-08-12T10:00:00Z"), "UTC");
    expect(day).toBe("2026-08-12");
    expect(getDaysUntil("2026-08-19", new Date("2026-08-12T10:00:00Z"), "UTC")).toBe(7);
  });

  it("acquires a cron lock and rejects a second concurrent lock", async () => {
    const mockInsertChain = {
      select: (jest.fn() as any).mockReturnThis(),
      single: (jest.fn() as any).mockRejectedValueOnce(new Error("duplicate key value violates unique constraint")),
    };
    const mockUpdateChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      lt: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValueOnce({ data: null, error: null }),
    };
    const mockDeleteChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValueOnce({ data: { job_name: "daily-missions" }, error: null }),
    };

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      insert: (jest.fn() as any).mockReturnValue(mockInsertChain),
      update: (jest.fn() as any).mockReturnValue(mockUpdateChain),
      delete: (jest.fn() as any).mockReturnValue(mockDeleteChain),
    });

    const lock = await acquireCronLock("daily-missions", 60000, "owner-1");
    expect(lock.acquired).toBe(false);
  });

  it("allows a stale lock to be reclaimed", async () => {
    const mockInsertChain = {
      select: (jest.fn() as any).mockReturnThis(),
      single: (jest.fn() as any).mockRejectedValueOnce({ message: "duplicate key value violates unique constraint", code: "23505" }),
    };
    const mockUpdateChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      lt: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValueOnce({ data: { job_name: "daily-missions", owner_token: "owner-2", lease_expires_at: new Date().toISOString() }, error: null }),
    };
    const mockDeleteChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValueOnce({ data: { job_name: "daily-missions" }, error: null }),
    };

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      insert: (jest.fn() as any).mockReturnValue(mockInsertChain),
      update: (jest.fn() as any).mockReturnValue(mockUpdateChain),
      delete: (jest.fn() as any).mockReturnValue(mockDeleteChain),
    });

    const lock = await acquireCronLock("daily-missions", 60000, "owner-2");
    expect(lock.acquired).toBe(true);
  });

  it("releases only the owner token that acquired the lock", async () => {
    const mockDeleteChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValueOnce({ data: { job_name: "daily-missions" }, error: null }),
    };

    (supabaseAdmin.from as jest.Mock).mockReturnValueOnce({
      delete: (jest.fn() as any).mockReturnValue(mockDeleteChain),
    });

    const result = await releaseCronLock("daily-missions", "owner-1");
    expect(result).toBe(true);
  });

  it("executes the task when the lock is acquired and skips when already locked", async () => {
    let callCount = 0;
    const mockInsertSuccessChain = {
      select: (jest.fn() as any).mockReturnThis(),
      single: (jest.fn() as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { job_name: "daily-missions", owner_token: "owner-1", lease_expires_at: new Date().toISOString() }, error: null });
        }
        return Promise.reject({ code: "23505" });
      }),
    };
    const mockUpdateChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      lt: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValue({ data: null, error: null }),
    };
    const mockDeleteChain = {
      eq: (jest.fn() as any).mockReturnThis(),
      select: (jest.fn() as any).mockReturnThis(),
      maybeSingle: (jest.fn() as any).mockResolvedValue({ data: { job_name: "daily-missions" }, error: null }),
    };

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      insert: (jest.fn() as any).mockReturnValue(mockInsertSuccessChain),
      update: (jest.fn() as any).mockReturnValue(mockUpdateChain),
      delete: (jest.fn() as any).mockReturnValue(mockDeleteChain),
    });

    const result = await executeCronJob("daily-missions", async () => ({ ok: true }));
    expect(result).toEqual(expect.objectContaining({ ok: true }));

    const skipped = await executeCronJob("daily-missions", async () => ({ ok: false }));
    expect(skipped).toEqual(expect.objectContaining({ skipped: true, jobName: "daily-missions", status: "skipped" }));
  });
});
