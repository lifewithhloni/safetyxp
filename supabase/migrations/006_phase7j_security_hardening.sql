alter table if exists public.companies enable row level security;
alter table if exists public.notification_deliveries enable row level security;

create policy "Users can read own company"
on public.companies
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
  )
);

create policy "Super admins can update own company"
on public.companies
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
      and p.role = 'super_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
      and p.role = 'super_admin'
  )
);

create policy "Admins can manage company notification deliveries"
on public.notification_deliveries
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = notification_deliveries.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = notification_deliveries.company_id
      and p.role in ('admin','super_admin')
  )
);

create index if not exists idx_notification_deliveries_company_recipient
  on public.notification_deliveries(company_id, recipient);

create index if not exists idx_certificates_storage_path
  on public.certificates(storage_path);

create index if not exists idx_policy_documents_storage_path
  on public.policy_documents(storage_path);

create index if not exists idx_profiles_company_role
  on public.profiles(company_id, role);

create index if not exists idx_campaigns_company_policy
  on public.campaigns(company_id, policy_id);

create index if not exists idx_mission_progress_employee_mission
  on public.mission_progress(employee_id, mission_id);

create index if not exists idx_daily_missions_campaign_employee
  on public.daily_missions(campaign_id, employee_id);

create index if not exists idx_generated_content_company_status
  on public.generated_content(company_id, status);

create index if not exists idx_ai_generation_jobs_company_status
  on public.ai_generation_jobs(company_id, status);

create index if not exists idx_ai_usage_records_company_operation
  on public.ai_usage_records(company_id, operation);

-- Storage policies hardening.
-- NOTE: assumes object names are persisted in related tables via storage_path.

drop policy if exists "Policy documents are publicly readable within the company" on storage.objects;
drop policy if exists "Admins can upload policy documents" on storage.objects;
drop policy if exists "Admins can update policy documents" on storage.objects;
drop policy if exists "Admins can delete policy documents" on storage.objects;

drop policy if exists "Certificates are readable inside company" on storage.objects;
drop policy if exists "Admins can upload certificates" on storage.objects;
drop policy if exists "Admins can update certificates" on storage.objects;
drop policy if exists "Admins can delete certificates" on storage.objects;

drop policy if exists "Company assets readable within company" on storage.objects;
drop policy if exists "Admins can upload company assets" on storage.objects;
drop policy if exists "Admins can update company assets" on storage.objects;
drop policy if exists "Admins can delete company assets" on storage.objects;

create policy "Policy documents: company members can read own-company documents"
on storage.objects
for select
using (
  bucket_id = 'policy-documents'
  and exists (
    select 1
    from public.policy_documents d
    join public.profiles p on p.id = auth.uid()
    where d.storage_path = storage.objects.name
      and d.company_id = p.company_id
  )
);

create policy "Policy documents: admins can write own-company documents"
on storage.objects
for all
using (
  bucket_id = 'policy-documents'
  and exists (
    select 1
    from public.policy_documents d
    join public.profiles p on p.id = auth.uid()
    where d.storage_path = storage.objects.name
      and d.company_id = p.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  bucket_id = 'policy-documents'
  and exists (
    select 1
    from public.policy_documents d
    join public.profiles p on p.id = auth.uid()
    where d.storage_path = storage.objects.name
      and d.company_id = p.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Certificates: owner or company admin can read"
on storage.objects
for select
using (
  bucket_id = 'certificates'
  and exists (
    select 1
    from public.certificates c
    join public.profiles p on p.id = auth.uid()
    where c.storage_path = storage.objects.name
      and (
        c.employee_id = p.id
        or (c.company_id = p.company_id and p.role in ('admin','super_admin'))
      )
  )
);

create policy "Certificates: admins can write own-company certificates"
on storage.objects
for all
using (
  bucket_id = 'certificates'
  and exists (
    select 1
    from public.certificates c
    join public.profiles p on p.id = auth.uid()
    where c.storage_path = storage.objects.name
      and c.company_id = p.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  bucket_id = 'certificates'
  and exists (
    select 1
    from public.certificates c
    join public.profiles p on p.id = auth.uid()
    where c.storage_path = storage.objects.name
      and c.company_id = p.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Company assets: company members can read by company path"
on storage.objects
for select
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and split_part(storage.objects.name, '/', 2) = p.company_id::text
  )
);

create policy "Company assets: admins can write by company path"
on storage.objects
for all
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and split_part(storage.objects.name, '/', 2) = p.company_id::text
      and p.role in ('admin','super_admin')
  )
)
with check (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and split_part(storage.objects.name, '/', 2) = p.company_id::text
      and p.role in ('admin','super_admin')
  )
);
