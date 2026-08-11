# SafetyXP database architecture

## Summary
The database model is designed as a multi-tenant, audit-friendly schema for learning, compliance, progress tracking, and AI-assisted content creation.

## Core entities
- Companies
- Users
- Roles
- Departments
- Policies
- Learning Modules
- Quizzes
- Questions
- Scenario Challenges
- Certificates
- Progress
- Achievements
- XP
- Notifications
- Audit Logs
- AI Generated Content

## Design notes
- Every tenant-scoped entity should include company_id.
- User identity should be separate from role and department ownership.
- Progress and certificate records should be append-friendly for historical analysis.
- Audit logs should capture changes for governance and internal review.
- AI-generated content should be versioned and approved before publication.

## Supabase migration readiness
- Use UUID primary keys.
- Keep timestamps in ISO 8601 format.
- Add indexes on company_id, user_id, module_id, and status fields.
- Introduce row-level security around company ownership later.
