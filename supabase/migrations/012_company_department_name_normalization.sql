do $$
begin
  if exists (
    select 1
    from public.departments
    group by company_id, lower(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate company departments exist after trimming and case folding. Resolve duplicates before applying this migration.';
  end if;
end
$$;

create unique index if not exists idx_departments_company_normalized_name
  on public.departments (
    company_id,
    lower(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
  );
