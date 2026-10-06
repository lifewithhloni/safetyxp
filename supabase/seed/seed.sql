insert into companies (id, name, industry, logo_url)
values (
  '11111111-1111-4111-8111-111111111111',
  'Acme Safety Group',
  'Manufacturing',
  null
)
on conflict (id) do nothing;

insert into departments (id, company_id, name)
values
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Operations'),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'Maintenance'),
  ('22222222-2222-4222-8222-222222222224', '11111111-1111-4111-8111-111111111111', 'Logistics'),
  ('22222222-2222-4222-8222-222222222225', '11111111-1111-4111-8111-111111111111', 'Safety & Compliance')
on conflict (company_id, name) do nothing;

insert into policies (id, company_id, title, description, status, created_by)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Lockout Tagout Procedure',
  'Workplace energy isolation requirements.',
  'active',
  null
);

insert into campaigns (id, company_id, policy_id, name, description, official_deadline, learning_deadline, buffer_days, status, created_by)
values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Q3 Lockout Tagout Campaign',
  'Mandatory training rollout for all operations staff.',
  '2026-12-31T00:00:00Z',
  '2026-12-15T00:00:00Z',
  7,
  'active',
  null
)
on conflict (id) do nothing;

insert into achievements (id, company_id, name, description, icon, xp_reward)
values (
  '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Safety Starter', 'Completed first compliance mission.', 'shield', 150),
  ('55555555-5555-4555-8555-555555555556', '11111111-1111-4111-8111-111111111111', 'Compliance Champion', 'Completed all assigned safety modules.', 'medal', 500)
on conflict (id) do nothing;

insert into learning_modules (id, campaign_id, title, description, content, estimated_minutes, order_index, status)
values (
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  'Energy Isolation Basics',
  'Learn the essential steps in lockout tagout.',
  'Understand isolation points, testing for zero energy, and verification techniques.',
  25,
  1,
  'published'
),
(
  '66666666-6666-4666-8666-666666666667',
  '44444444-4444-4444-8444-444444444444',
  'Machine-Specific Procedures',
  'Review role-based procedures and responsibilities.',
  'Compare equipment-specific procedures and identify required steps.',
  20,
  2,
  'published'
)
on conflict (id) do nothing;

insert into quiz_questions (id, campaign_id, module_id, question, options, correct_answer, explanation, difficulty, xp_reward, status)
values (
  '77777777-7777-4777-8777-777777777777',
  '44444444-4444-4444-8444-444444444444',
  '66666666-6666-4666-8666-666666666666',
  'What must be verified before work begins?',
  '[["Machine is off","Energy is isolated and zero-energy verified","Supervisor approval received","Only the lock is attached]]'::jsonb,
  'Energy is isolated and zero-energy verified',
  'Zero-energy verification is essential before servicing equipment.',
  'beginner',
  100,
  'active'
)
on conflict (id) do nothing;

insert into scenarios (id, campaign_id, module_id, title, situation, options, correct_response, explanation, learning_objective, xp_reward, status)
values (
  '88888888-8888-4888-8888-888888888888',
  '44444444-4444-4444-8444-444444444444',
  '66666666-6666-4666-8666-666666666667',
  'Maintenance response',
  'A technician notices a press is still energized while preparing to inspect a gearbox.',
  '[["Proceed with inspection to save time","Stop work and isolate energy before proceeding","Wait for a teammate to finish","Document the issue and continue next shift]]'::jsonb,
  'Stop work and isolate energy before proceeding',
  'Safety-critical work must stop until zero energy is confirmed.',
  'Respond to hazardous work conditions safely.',
  150,
  'active'
)
on conflict (id) do nothing;
