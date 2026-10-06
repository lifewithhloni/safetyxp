alter table if exists public.campaigns
  add column if not exists required_lesson_completion boolean not null default true,
  add column if not exists required_quiz_completion boolean not null default true,
  add column if not exists required_scenario_completion boolean not null default true,
  add column if not exists requires_final_assessment boolean not null default false,
  add column if not exists minimum_quiz_score numeric not null default 80,
  add column if not exists minimum_final_assessment_score numeric not null default 80,
  add column if not exists certificate_expiry_days integer;

alter table if exists public.certificates
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.certificates
  drop constraint if exists certificates_status_check;

alter table if exists public.certificates
  add constraint certificates_status_check
  check (status in ('eligible','generating','issued','expired','revoked','failed'));

update public.certificates
set status = case
  when status = 'active' then 'issued'
  when status = 'expired' then 'expired'
  when status = 'revoked' then 'revoked'
  else status
end;

create index if not exists idx_certificates_verification_code on public.certificates(verification_code);
create index if not exists idx_certificates_employee_campaign on public.certificates(employee_id, campaign_id);
