-- Phase 9 Item 16: Cron Job Locks Table
-- Distributed lock mechanism for scheduled job concurrency control
-- No company scoping (system-level table)
-- RLS enabled, no user-facing policies (implicit deny-all for authenticated/anonymous clients)
-- Service-role clients can access via RLS bypass

CREATE TABLE IF NOT EXISTS public.cron_job_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL UNIQUE,
  owner_token text NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_locks_job_name
  ON public.cron_job_locks(job_name);

CREATE INDEX IF NOT EXISTS idx_cron_job_locks_lease_expires_at
  ON public.cron_job_locks(lease_expires_at);

ALTER TABLE public.cron_job_locks ENABLE ROW LEVEL SECURITY;

-- No RLS policies defined (implicit deny-all for authenticated/anonymous clients)
-- Service-role client always bypasses RLS and can perform all operations
