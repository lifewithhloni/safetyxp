create table if not exists ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  policy_id uuid not null references policies(id) on delete cascade,
  policy_document_id uuid not null references policy_documents(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'QUEUED' check (status in ('QUEUED','ANALYZING','GENERATING','VALIDATING','READY_FOR_REVIEW','FAILED','APPROVED','PUBLISHED')),
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  policy_id uuid not null references policies(id) on delete cascade,
  operation text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table generated_content
  drop constraint if exists generated_content_status_check;

alter table generated_content
  add constraint generated_content_status_check
  check (status in ('QUEUED','ANALYZING','GENERATING','VALIDATING','AI_GENERATED','UNDER_REVIEW','READY_FOR_REVIEW','FAILED','APPROVED','REJECTED','PUBLISHED'));

drop policy if exists "Users can read generated content in their company" on public.generated_content;

create policy "Users can read generated content in their company"
on public.generated_content
for select
using (
  (
    status = 'PUBLISHED'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = generated_content.company_id
    )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = generated_content.company_id
      and p.role in ('admin','super_admin')
  )
);

alter table ai_generation_jobs enable row level security;
alter table ai_usage_records enable row level security;

create policy "Admins can manage ai generation jobs"
on public.ai_generation_jobs
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = ai_generation_jobs.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = ai_generation_jobs.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Admins can manage ai usage"
on public.ai_usage_records
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = ai_usage_records.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = ai_usage_records.company_id
      and p.role in ('admin','super_admin')
  )
);

create index if not exists idx_ai_generation_jobs_company_id on ai_generation_jobs(company_id);
create index if not exists idx_ai_generation_jobs_policy_id on ai_generation_jobs(policy_id);
create index if not exists idx_ai_generation_jobs_status on ai_generation_jobs(status);
create index if not exists idx_ai_usage_records_company_id on ai_usage_records(company_id);
create index if not exists idx_ai_usage_records_created_at on ai_usage_records(created_at);
