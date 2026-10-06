-- Phase 9 Item 17: Eliminate recursive RLS evaluation on public.profiles.

create or replace function public.is_company_admin(company_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and company_id = company_id_input
      and role in ('admin', 'super_admin')
  );
$$;

revoke execute on function public.is_company_admin(uuid) from public;
grant execute on function public.is_company_admin(uuid) to authenticated, service_role;

drop policy if exists "Admins can manage company profiles" on public.profiles;

create policy "Admins can manage company profiles"
on public.profiles
for all
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));