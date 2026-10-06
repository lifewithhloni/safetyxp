create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('employee','admin','super_admin')),
  job_title text,
  department_id uuid,
  employee_number text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_number)
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

alter table profiles
  add constraint fk_profiles_department
  foreign key (department_id) references departments(id) on delete set null;

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policies(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text,
  file_size bigint,
  page_count integer,
  extracted_text text,
  processing_status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  policy_id uuid references policies(id) on delete set null,
  name text not null,
  description text,
  official_deadline timestamptz not null,
  learning_deadline timestamptz not null,
  buffer_days integer not null default 2 check (buffer_days >= 0),
  status text not null default 'draft' check (status in ('draft','published','active','completed','archived')),
  created_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  employee_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  status text not null default 'assigned' check (status in ('assigned','active','completed','overdue')),
  completion_percentage numeric not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  completed_at timestamptz,
  unique (campaign_id, employee_id)
);

create table if not exists learning_modules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  title text not null,
  description text,
  content text,
  estimated_minutes integer,
  order_index integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  source_document_id uuid,
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists daily_missions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  employee_id uuid not null references profiles(id) on delete cascade,
  module_id uuid references learning_modules(id) on delete set null,
  scheduled_date date not null,
  type text not null,
  title text not null,
  description text,
  estimated_minutes integer,
  order_index integer not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','missed','overdue')),
  xp_reward integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, employee_id, scheduled_date, module_id)
);

create table if not exists mission_progress (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references daily_missions(id) on delete cascade,
  employee_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','missed','overdue')),
  score numeric,
  unique (mission_id, employee_id)
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  module_id uuid references learning_modules(id) on delete set null,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text,
  difficulty text,
  xp_reward integer not null default 0,
  status text not null default 'active' check (status in ('active','archived')),
  source_document_id uuid,
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  module_id uuid references learning_modules(id) on delete set null,
  title text not null,
  situation text not null,
  options jsonb not null,
  correct_response text not null,
  explanation text,
  learning_objective text,
  xp_reward integer not null default 0,
  status text not null default 'active' check (status in ('active','archived')),
  source_document_id uuid,
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  module_id uuid references learning_modules(id) on delete set null,
  front text not null,
  back text not null,
  category text,
  difficulty text,
  status text not null default 'active' check (status in ('active','archived')),
  source_document_id uuid,
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references profiles(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  certificate_number text not null unique,
  issued_at timestamptz,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  verification_code text not null unique,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists employee_xp (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references profiles(id) on delete cascade,
  total_xp integer not null default 0,
  current_level integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  xp_reward integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists employee_achievements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (employee_id, achievement_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  channel text not null default 'IN_APP' check (channel in ('IN_APP','EMAIL','PUSH','SMS','TEAMS','SLACK')),
  status text not null default 'pending' check (status in ('pending','sent','read','failed')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  daily_missions boolean not null default true,
  compliance_reminders boolean not null default true,
  certificate_notifications boolean not null default true,
  achievement_notifications boolean not null default true,
  weekly_summary boolean not null default true,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true
);

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  trigger text not null,
  audience text[] not null,
  channel text[] not null,
  frequency text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  policy_id uuid references policies(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  content_type text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'AI_GENERATED' check (status in ('AI_GENERATED','UNDER_REVIEW','APPROVED','REJECTED','PUBLISHED')),
  source_document_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_reviews (
  id uuid primary key default gen_random_uuid(),
  generated_content_id uuid not null references generated_content(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  reviewed_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_created_at on companies(created_at);
create index if not exists idx_profiles_company_id on profiles(company_id);
create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_profiles_department_id on profiles(department_id);
create index if not exists idx_departments_company_id on departments(company_id);
create index if not exists idx_policies_company_id on policies(company_id);
create index if not exists idx_policy_documents_policy_id on policy_documents(policy_id);
create index if not exists idx_campaigns_company_id on campaigns(company_id);
create index if not exists idx_campaigns_status on campaigns(status);
create index if not exists idx_campaign_participants_campaign_id on campaign_participants(campaign_id);
create index if not exists idx_campaign_participants_employee_id on campaign_participants(employee_id);
create index if not exists idx_learning_modules_campaign_id on learning_modules(campaign_id);
create index if not exists idx_daily_missions_employee_id on daily_missions(employee_id);
create index if not exists idx_daily_missions_scheduled_date on daily_missions(scheduled_date);
create index if not exists idx_daily_missions_status on daily_missions(status);
create index if not exists idx_mission_progress_mission_id on mission_progress(mission_id);
create index if not exists idx_quiz_questions_campaign_id on quiz_questions(campaign_id);
create index if not exists idx_scenarios_campaign_id on scenarios(campaign_id);
create index if not exists idx_flashcards_campaign_id on flashcards(campaign_id);
create index if not exists idx_certificates_company_id on certificates(company_id);
create index if not exists idx_certificates_employee_id on certificates(employee_id);
create index if not exists idx_employee_xp_employee_id on employee_xp(employee_id);
create index if not exists idx_notifications_company_id on notifications(company_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_status on notifications(status);
create index if not exists idx_automation_rules_company_id on automation_rules(company_id);
create index if not exists idx_generated_content_company_id on generated_content(company_id);
create index if not exists idx_audit_logs_company_id on audit_logs(company_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);
