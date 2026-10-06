-- Phase 9 Item 17: Restrict company admin helper execution to trusted roles.

revoke execute on function public.is_company_admin(uuid) from public, anon;

grant execute on function public.is_company_admin(uuid) to authenticated, service_role;