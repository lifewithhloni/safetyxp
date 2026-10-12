drop policy if exists "Users can read their campaign participation"
on public.campaign_participants;

drop policy if exists "Admins can manage campaign participants"
on public.campaign_participants;

create policy "Users can read their campaign participation"
on public.campaign_participants
for select
using (
  exists (
    select 1
    from public.profiles user_profile
    join public.campaigns c
      on c.id = campaign_participants.campaign_id
    join public.profiles participant_profile
      on participant_profile.id = campaign_participants.employee_id
    where user_profile.id = auth.uid()
      and user_profile.company_id = c.company_id
      and participant_profile.company_id = c.company_id
      and participant_profile.role = 'employee'
  )
);

create policy "Admins can manage campaign participants"
on public.campaign_participants
for all
using (
  exists (
    select 1
    from public.profiles admin_profile
    join public.campaigns c
      on c.id = campaign_participants.campaign_id
    join public.profiles participant_profile
      on participant_profile.id = campaign_participants.employee_id
    where admin_profile.id = auth.uid()
      and admin_profile.company_id = c.company_id
      and admin_profile.role in ('admin', 'super_admin')
      and participant_profile.company_id = c.company_id
      and participant_profile.role = 'employee'
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    join public.campaigns c
      on c.id = campaign_participants.campaign_id
    join public.profiles participant_profile
      on participant_profile.id = campaign_participants.employee_id
    where admin_profile.id = auth.uid()
      and admin_profile.company_id = c.company_id
      and admin_profile.role in ('admin', 'super_admin')
      and participant_profile.company_id = c.company_id
      and participant_profile.role = 'employee'
  )
);
