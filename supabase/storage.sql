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

create policy if not exists "Policy documents: company members can read own-company documents"
on storage.objects for select
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

create policy if not exists "Policy documents: admins can write own-company documents"
on storage.objects for all
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

create policy if not exists "Certificates: owner or company admin can read"
on storage.objects for select
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

create policy if not exists "Certificates: admins can write own-company certificates"
on storage.objects for all
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

create policy if not exists "Company assets: company members can read by company path"
on storage.objects for select
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and split_part(storage.objects.name, '/', 2) = p.company_id::text
  )
);

create policy if not exists "Company assets: admins can write by company path"
on storage.objects for all
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
