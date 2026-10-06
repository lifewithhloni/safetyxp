import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/security/sentry-server";

export class CronAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronAuthError";
  }
}

export class CronLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronLockError";
  }
}

export const CRON_JOB_LOCK_TTL_MS = 5 * 60 * 1000;
export const CRON_JOB_BATCH_LIMIT = 200;

export function createCronJobExecutionToken() {
  return `cron-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function acquireCronLock(jobName: string, ttlMs = CRON_JOB_LOCK_TTL_MS, ownerToken = createCronJobExecutionToken()) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("cron_job_locks")
      .insert({
        job_name: jobName,
        owner_token: ownerToken,
        lease_expires_at: expiresAt,
        acquired_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("job_name, owner_token, lease_expires_at")
      .single();

    if (error) {
      throw error;
    }

    return {
      acquired: true,
      jobName,
      ownerToken,
      leaseExpiresAt: expiresAt,
      row: data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron lock acquisition failed.";
    const duplicateLock = /duplicate|already exists/i.test(message) || (typeof error === "object" && error && "code" in error && error.code === "23505");

    if (!duplicateLock) {
      throw error;
    }

    const staleCutoff = now.toISOString();
    const { data, error: updateError } = await supabaseAdmin
      .from("cron_job_locks")
      .update({
        owner_token: ownerToken,
        lease_expires_at: expiresAt,
        updated_at: now.toISOString(),
      })
      .eq("job_name", jobName)
      .lt("lease_expires_at", staleCutoff)
      .select("job_name, owner_token, lease_expires_at")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!data) {
      return {
        acquired: false,
        jobName,
        ownerToken,
        leaseExpiresAt: expiresAt,
      };
    }

    return {
      acquired: true,
      jobName,
      ownerToken,
      leaseExpiresAt: expiresAt,
      row: data,
    };
  }
}

export async function releaseCronLock(jobName: string, ownerToken: string) {
  const { data, error } = await supabaseAdmin
    .from("cron_job_locks")
    .delete()
    .eq("job_name", jobName)
    .eq("owner_token", ownerToken)
    .select("job_name")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function executeCronJob<T>(jobName: string, task: () => Promise<T>, ttlMs = CRON_JOB_LOCK_TTL_MS) {
  const ownerToken = createCronJobExecutionToken();
  const lock = await acquireCronLock(jobName, ttlMs, ownerToken);

  if (!lock.acquired) {
    return {
      skipped: true,
      jobName,
      status: "skipped",
    } as T & { skipped: boolean; jobName: string; status: "skipped" };
  }

  try {
    return await task();
  } finally {
    await releaseCronLock(jobName, ownerToken);
  }
}

export function requireCronSecret(request: Request) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    throw new CronAuthError("CRON_SECRET is not configured.");
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = request.headers.get("x-cron-secret");
  const supplied = bearer || header;

  if (supplied !== configured) {
    throw new CronAuthError("Invalid cron secret.");
  }
}

export function isCronAuthError(error: unknown): error is CronAuthError {
  return error instanceof CronAuthError;
}

export function reportCronJobFailure(error: unknown, jobName: string) {
  reportServerError(error, {
    component: "cron",
    job_name: jobName,
    failure_scope: "job",
  });
}

export function startOfCompanyDay(date = new Date(), timeZone = "UTC") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function getDaysUntil(targetDate: string, referenceDate = new Date(), timeZone = "UTC") {
  const today = startOfCompanyDay(referenceDate, timeZone);
  const start = new Date(`${today}T00:00:00Z`).getTime();
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  return Math.round((target - start) / 86400000);
}
