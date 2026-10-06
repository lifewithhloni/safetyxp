alter table companies enable row level security;
alter table profiles enable row level security;
alter table departments enable row level security;
alter table policies enable row level security;
alter table policy_documents enable row level security;
alter table campaigns enable row level security;
alter table campaign_participants enable row level security;
alter table learning_modules enable row level security;
alter table daily_missions enable row level security;
alter table mission_progress enable row level security;
alter table quiz_questions enable row level security;
alter table scenarios enable row level security;
alter table flashcards enable row level security;
alter table certificates enable row level security;
alter table employee_xp enable row level security;
alter table achievements enable row level security;
alter table employee_achievements enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table automation_rules enable row level security;
alter table generated_content enable row level security;
alter table content_reviews enable row level security;
alter table audit_logs enable row level security;

create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_company_admin(company_id_input uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and company_id = company_id_input
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_company_member(company_id_input uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and company_id = company_id_input
  );
$$;

create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can manage company profiles"
on public.profiles
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = profiles.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = profiles.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company departments"
on public.departments
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = departments.company_id
  )
);

create policy "Admins can manage company departments"
on public.departments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = departments.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = departments.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company policies"
on public.policies
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = policies.company_id
  )
);

create policy "Admins can manage company policies"
on public.policies
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = policies.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = policies.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read policy documents in their company"
on public.policy_documents
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = policy_documents.company_id
  )
);

create policy "Admins can manage policy documents"
on public.policy_documents
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = policy_documents.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = policy_documents.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company campaigns"
on public.campaigns
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = campaigns.company_id
  )
);

create policy "Admins can manage company campaigns"
on public.campaigns
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = campaigns.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = campaigns.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read their campaign participation"
on public.campaign_participants
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = (
        select c.company_id from public.campaigns c where c.id = campaign_participants.campaign_id
      )
  )
);

create policy "Admins can manage campaign participants"
on public.campaign_participants
for all
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = campaign_participants.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = campaign_participants.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can view module details in their company"
on public.learning_modules
for select
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = learning_modules.campaign_id
    where p.id = auth.uid() and p.company_id = c.company_id
  )
);

create policy "Admins can manage learning modules"
on public.learning_modules
for all
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = learning_modules.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = learning_modules.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read their own missions"
on public.daily_missions
for select
using (auth.uid() = employee_id or exists (
  select 1 from public.profiles p
  join public.campaigns c on c.id = daily_missions.campaign_id
  where p.id = auth.uid()
    and p.company_id = c.company_id
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage company missions"
on public.daily_missions
for all
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = daily_missions.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = daily_missions.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can view progress for their own missions"
on public.mission_progress
for select
using (auth.uid() = employee_id or exists (
  select 1 from public.profiles p
  join public.daily_missions d on d.id = mission_progress.mission_id
  join public.campaigns c on c.id = d.campaign_id
  where p.id = auth.uid()
    and p.company_id = c.company_id
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage mission progress"
on public.mission_progress
for all
using (
  exists (
    select 1 from public.profiles p
    join public.daily_missions d on d.id = mission_progress.mission_id
    join public.campaigns c on c.id = d.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.daily_missions d on d.id = mission_progress.mission_id
    join public.campaigns c on c.id = d.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company quiz questions"
on public.quiz_questions
for select
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = quiz_questions.campaign_id
    where p.id = auth.uid() and p.company_id = c.company_id
  )
);

create policy "Admins can manage quiz questions"
on public.quiz_questions
for all
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = quiz_questions.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = quiz_questions.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company scenarios"
on public.scenarios
for select
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = scenarios.campaign_id
    where p.id = auth.uid() and p.company_id = c.company_id
  )
);

create policy "Admins can manage scenarios"
on public.scenarios
for all
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = scenarios.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = scenarios.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company flashcards"
on public.flashcards
for select
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = flashcards.campaign_id
    where p.id = auth.uid() and p.company_id = c.company_id
  )
);

create policy "Admins can manage flashcards"
on public.flashcards
for all
using (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = flashcards.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.campaigns c on c.id = flashcards.campaign_id
    where p.id = auth.uid()
      and p.company_id = c.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can view their certificates"
on public.certificates
for select
using (auth.uid() = employee_id or exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.company_id = certificates.company_id
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage certificates"
on public.certificates
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = certificates.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = certificates.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read own XP"
on public.employee_xp
for select
using (auth.uid() = employee_id or exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.company_id = (
      select company_id from public.profiles where id = employee_xp.employee_id
    )
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage employee XP"
on public.employee_xp
for all
using (
  exists (
    select 1 from public.profiles p
    join public.profiles emp on emp.id = employee_xp.employee_id
    where p.id = auth.uid()
      and p.company_id = emp.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.profiles emp on emp.id = employee_xp.employee_id
    where p.id = auth.uid()
      and p.company_id = emp.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company achievements"
on public.achievements
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = achievements.company_id
  )
);

create policy "Admins can manage achievements"
on public.achievements
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = achievements.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = achievements.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read their own achievements"
on public.employee_achievements
for select
using (auth.uid() = employee_id or exists (
  select 1 from public.profiles p
  join public.profiles emp on emp.id = employee_achievements.employee_id
  where p.id = auth.uid()
    and p.company_id = emp.company_id
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage employee achievements"
on public.employee_achievements
for all
using (
  exists (
    select 1 from public.profiles p
    join public.profiles emp on emp.id = employee_achievements.employee_id
    where p.id = auth.uid()
      and p.company_id = emp.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.profiles emp on emp.id = employee_achievements.employee_id
    where p.id = auth.uid()
      and p.company_id = emp.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read their own notifications"
on public.notifications
for select
using (auth.uid() = user_id or exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.company_id = notifications.company_id
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage notifications"
on public.notifications
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = notifications.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = notifications.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can manage their notification preferences"
on public.notification_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read company automation rules"
on public.automation_rules
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = automation_rules.company_id
  )
);

create policy "Admins can manage automation rules"
on public.automation_rules
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = automation_rules.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = automation_rules.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read generated content in their company"
on public.generated_content
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = generated_content.company_id
  )
);

create policy "Admins can manage generated content"
on public.generated_content
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = generated_content.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = generated_content.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read their review records"
on public.content_reviews
for select
using (auth.uid() = reviewer_id or exists (
  select 1 from public.profiles p
  join public.generated_content g on g.id = content_reviews.generated_content_id
  where p.id = auth.uid()
    and p.company_id = g.company_id
    and p.role in ('admin','super_admin')
));

create policy "Admins can manage content reviews"
on public.content_reviews
for all
using (
  exists (
    select 1 from public.profiles p
    join public.generated_content g on g.id = content_reviews.generated_content_id
    where p.id = auth.uid()
      and p.company_id = g.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.generated_content g on g.id = content_reviews.generated_content_id
    where p.id = auth.uid()
      and p.company_id = g.company_id
      and p.role in ('admin','super_admin')
  )
);

create policy "Users can read company audit logs"
on public.audit_logs
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = audit_logs.company_id
  )
);

create policy "Admins can manage audit logs"
on public.audit_logs
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = audit_logs.company_id
      and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = audit_logs.company_id
      and p.role in ('admin','super_admin')
  )
);
