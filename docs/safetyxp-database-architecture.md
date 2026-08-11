# SafetyXP database architecture

## Scope

This architecture is intentionally mock-first and Supabase-ready. It models the core domain entities for an enterprise learning and compliance platform without implementing CRUD.

## Core design principles

- Multi-tenant by company
- Read-oriented repository interfaces for future Supabase adaptation
- Auditability for governance and compliance
- XP and achievement tracking as first-class primitives
- AI-generated content tracked separately to support approval workflows

## Entity map

### 1. Companies
- Primary key: id
- Related to: roles, departments, users, policies, learning modules, certificates, notifications, audit logs, AI content

### 2. Users
- Primary key: id
- Foreign keys: role_id, department_id, manager_id, company_id
- Related to: progress, certificates, achievements, XP events, notifications

### 3. Roles
- Primary key: id
- Foreign key: company_id
- Supports role-based access control for employee, manager, admin, super_admin, auditor

### 4. Departments
- Primary key: id
- Foreign keys: company_id, parent_department_id, manager_id
- Supports hierarchy and ownership

### 5. Policies
- Primary key: id
- Foreign keys: company_id, owner_user_id
- Supports compliance and learning linkage

### 6. Learning Modules
- Primary key: id
- Foreign keys: company_id, policy_id, prerequisite_module_id
- Supports learning paths and sequencing

### 7. Quizzes
- Primary key: id
- Foreign key: module_id
- Aggregates questions

### 8. Questions
- Primary key: id
- Foreign key: quiz_id
- Stores answer options and correctness metadata

### 9. Scenario Challenges
- Primary key: id
- Foreign keys: company_id, module_id, policy_id
- Supports judgment-based learning and incident response training

### 10. Certificates
- Primary key: id
- Foreign keys: company_id, user_id, module_id, quiz_id
- Represents issuance and expiration of proof of completion

### 11. Progress
- Primary key: id
- Foreign keys: company_id, user_id, module_id, quiz_id
- Tracks completion state and XP earned

### 12. Achievements
- Primary key: id
- Foreign keys: company_id, user_id
- Represents milestone unlocks and badges

### 13. XP
- Primary key: id
- Foreign keys: company_id, user_id
- Records earned points and their source

### 14. Notifications
- Primary key: id
- Foreign keys: company_id, user_id
- Supports engagement and operational reminders

### 15. Audit Logs
- Primary key: id
- Foreign keys: company_id, actor_user_id
- Captures compliance-critical events

### 16. AI Generated Content
- Primary key: id
- Foreign keys: company_id, created_by_user_id, entity_id
- Supports approval and provenance of AI-generated training material

## Recommended Supabase mapping

- Use UUID primary keys in Supabase for all tables.
- Keep company-level tenancy explicit with company_id columns.
- Add row-level security policies later using company_id and user role.
- Use timestamp columns created_at and updated_at for observability.
- Extend with indexes on company_id, user_id, module_id, quiz_id, and status fields.
