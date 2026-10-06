create table if not exists public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  status text not null check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  total_rows integer not null default 0 check (total_rows >= 0),
  processed_rows integer not null default 0 check (processed_rows >= 0),
  successful_rows integer not null default 0 check (successful_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  status text not null check (status in ('PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (processed_rows <= total_rows),
  check (successful_rows + failed_rows + skipped_rows <= processed_rows)
);

create table if not exists public.employee_import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.employee_import_batches(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  field text not null,
  error_code text not null,
  message text not null,
  row_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(row_data) = 'object'),
  check (row_data::text !~* 'password'),
  check (row_data::text !~* 'token_hash'),
  check (row_data::text !~* 'raw_token'),
  check (row_data::text !~* 'invitation_token')
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  mission_id uuid references public.daily_missions(id) on delete set null,
  quiz_question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer text not null,
  is_correct boolean not null default false,
  score numeric(5,2) not null default 0,
  attempt integer not null default 1 check (attempt > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, quiz_question_id, attempt),
  check (score >= 0)
);

create table if not exists public.scenario_answers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  mission_id uuid references public.daily_missions(id) on delete set null,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  selected_response text not null,
  is_correct boolean not null default false,
  score numeric(5,2) not null default 0,
  attempt integer not null default 1 check (attempt > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, scenario_id, attempt),
  check (score >= 0)
);

create unique index if not exists idx_employee_invitations_token_hash on public.employee_invitations(token_hash);
create unique index if not exists idx_employee_invitations_pending_employee on public.employee_invitations(company_id, employee_id) where status = 'PENDING';
create unique index if not exists idx_employee_invitations_pending_email on public.employee_invitations(company_id, email) where status = 'PENDING';
create index if not exists idx_employee_invitations_company_id on public.employee_invitations(company_id);
create index if not exists idx_employee_invitations_employee_id on public.employee_invitations(employee_id);
create index if not exists idx_employee_invitations_email on public.employee_invitations(email);
create index if not exists idx_employee_invitations_created_at on public.employee_invitations(created_at);
create index if not exists idx_employee_invitations_expires_at on public.employee_invitations(expires_at);

create index if not exists idx_employee_import_batches_company_id on public.employee_import_batches(company_id);
create index if not exists idx_employee_import_batches_created_by on public.employee_import_batches(created_by);
create index if not exists idx_employee_import_batches_status on public.employee_import_batches(status);
create index if not exists idx_employee_import_batches_created_at on public.employee_import_batches(created_at);
create index if not exists idx_employee_import_batches_completed_at on public.employee_import_batches(completed_at);

create index if not exists idx_employee_import_errors_batch_id on public.employee_import_errors(batch_id);
create index if not exists idx_employee_import_errors_company_id on public.employee_import_errors(company_id);
create index if not exists idx_employee_import_errors_row_number on public.employee_import_errors(row_number);
create index if not exists idx_employee_import_errors_created_at on public.employee_import_errors(created_at);

create index if not exists idx_quiz_answers_company_id on public.quiz_answers(company_id);
create index if not exists idx_quiz_answers_employee_id on public.quiz_answers(employee_id);
create index if not exists idx_quiz_answers_campaign_id on public.quiz_answers(campaign_id);
create index if not exists idx_quiz_answers_mission_id on public.quiz_answers(mission_id);
create index if not exists idx_quiz_answers_question_id on public.quiz_answers(quiz_question_id);
create index if not exists idx_quiz_answers_completed_at on public.quiz_answers(completed_at);
create index if not exists idx_quiz_answers_created_at on public.quiz_answers(created_at);

create index if not exists idx_scenario_answers_company_id on public.scenario_answers(company_id);
create index if not exists idx_scenario_answers_employee_id on public.scenario_answers(employee_id);
create index if not exists idx_scenario_answers_campaign_id on public.scenario_answers(campaign_id);
create index if not exists idx_scenario_answers_mission_id on public.scenario_answers(mission_id);
create index if not exists idx_scenario_answers_scenario_id on public.scenario_answers(scenario_id);
create index if not exists idx_scenario_answers_completed_at on public.scenario_answers(completed_at);
create index if not exists idx_scenario_answers_created_at on public.scenario_answers(created_at);

alter table public.employee_invitations enable row level security;
alter table public.employee_import_batches enable row level security;
alter table public.employee_import_errors enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.scenario_answers enable row level security;

drop policy if exists "Admins can manage employee invitations" on public.employee_invitations;
drop policy if exists "Employees can read own invitation state" on public.employee_invitations;
create policy "Admins can manage employee invitations"
on public.employee_invitations
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = employee_invitations.company_id
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = employee_invitations.company_id
      and p.role in ('admin', 'super_admin')
  )
);

create policy "Employees can read own invitation state"
on public.employee_invitations
for select
using (
  auth.uid() = employee_id
);

drop policy if exists "Admins can manage employee import batches" on public.employee_import_batches;
create policy "Admins can manage employee import batches"
on public.employee_import_batches
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = employee_import_batches.company_id
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = employee_import_batches.company_id
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "Admins can manage employee import errors" on public.employee_import_errors;
create policy "Admins can manage employee import errors"
on public.employee_import_errors
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = employee_import_errors.company_id
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = employee_import_errors.company_id
      and p.role in ('admin', 'super_admin')
  )
  and exists (
    select 1
    from public.employee_import_batches b
    where b.id = employee_import_errors.batch_id
      and b.company_id = employee_import_errors.company_id
  )
);

drop policy if exists "Employees can read own quiz answers" on public.quiz_answers;
drop policy if exists "Employees can insert own quiz answers" on public.quiz_answers;
drop policy if exists "Admins can manage company quiz answers" on public.quiz_answers;
create policy "Employees can read own quiz answers"
on public.quiz_answers
for select
using (
  auth.uid() = employee_id
);

create policy "Employees can insert own quiz answers"
on public.quiz_answers
for insert
with check (
  auth.uid() = employee_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = quiz_answers.company_id
  )
  and is_correct = false
  and score = 0
);

create policy "Admins can manage company quiz answers"
on public.quiz_answers
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = quiz_answers.company_id
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = quiz_answers.company_id
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "Employees can read own scenario answers" on public.scenario_answers;
drop policy if exists "Employees can insert own scenario answers" on public.scenario_answers;
drop policy if exists "Admins can manage company scenario answers" on public.scenario_answers;
create policy "Employees can read own scenario answers"
on public.scenario_answers
for select
using (
  auth.uid() = employee_id
);

create policy "Employees can insert own scenario answers"
on public.scenario_answers
for insert
with check (
  auth.uid() = employee_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = scenario_answers.company_id
  )
  and is_correct = false
  and score = 0
);

create policy "Admins can manage company scenario answers"
on public.scenario_answers
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = scenario_answers.company_id
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = scenario_answers.company_id
      and p.role in ('admin', 'super_admin')
  )
);