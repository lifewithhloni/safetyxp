-- Phase 9 Item 17: Protect profile authorization fields from self-service updates.
-- Ordinary users retain the existing self-update policy for non-security profile fields.

create or replace function public.prevent_profile_security_field_changes()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if old.id = auth.uid() then
    raise exception 'Users cannot change their own profile id, company_id, or role.';
  end if;

  if public.is_company_admin(old.company_id) then
    return new;
  end if;

  raise exception 'Only company administrators may change profile id, company_id, or role.';
end;
$$;

drop trigger if exists prevent_profile_security_field_changes on public.profiles;

create trigger prevent_profile_security_field_changes
before update of id, company_id, role on public.profiles
for each row
execute function public.prevent_profile_security_field_changes();