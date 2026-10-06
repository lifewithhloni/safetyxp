alter table if exists public.companies
  add column if not exists timezone text not null default 'UTC';

alter table if exists public.notifications
  add column if not exists idempotency_key text;

create unique index if not exists idx_notifications_idempotency_key
  on public.notifications(idempotency_key)
  where idempotency_key is not null;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient text not null,
  channel text not null check (channel in ('IN_APP','EMAIL','PUSH','SMS','TEAMS','SLACK')),
  provider text not null,
  status text not null default 'QUEUED' check (status in ('QUEUED','SENDING','SENT','DELIVERED','FAILED','CANCELLED')),
  attempts integer not null default 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_code text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_deliveries_notification_id on public.notification_deliveries(notification_id);
create index if not exists idx_notification_deliveries_company_id on public.notification_deliveries(company_id);
create index if not exists idx_notification_deliveries_status on public.notification_deliveries(status);
