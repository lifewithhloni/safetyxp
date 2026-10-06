export type DatabaseId = string;

export interface BaseRecord {
  id: DatabaseId;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface TenantScopedRecord extends BaseRecord {
  company_id: DatabaseId;
}

export interface AuditableRecord extends TenantScopedRecord {
  created_by?: DatabaseId | null;
  updated_by?: DatabaseId | null;
}

export type UserRoleName = "employee" | "manager" | "admin" | "super_admin" | "auditor";
export type DepartmentStatus = "active" | "inactive";
export type PolicyStatus = "draft" | "published" | "archived";
export type LearningModuleCategory = "safety" | "incident" | "compliance" | "leadership" | "wellbeing";
export type LearningModuleDifficulty = "beginner" | "intermediate" | "advanced";
export type QuizType = "assessment" | "practice" | "final";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "text";
export type ScenarioDifficulty = "easy" | "medium" | "hard";
export type CertificateStatus = "draft" | "issued" | "revoked" | "expired";
export type ProgressStatus = "not_started" | "in_progress" | "completed" | "failed";
export type AchievementCategory = "learning" | "safety" | "engagement" | "leadership";
export type XpSource = "quiz" | "module" | "achievement" | "challenge" | "bonus";
export type NotificationType = "policy_update" | "certificate_ready" | "achievement" | "reminder" | "system";
export type AuditAction = "insert" | "update" | "delete" | "view" | "approve" | "reject" | "sign_in";
export type AiContentStatus = "draft" | "approved" | "rejected" | "archived";

export interface CompanyRecord extends AuditableRecord {
  name: string;
  slug: string;
  industry: string;
  plan: "basic" | "enterprise" | "custom";
  status: "active" | "inactive" | "trial";
  region: string;
  timezone: string;
  settings: {
    allow_ai_generation: boolean;
    require_manager_approval: boolean;
    enable_xp: boolean;
  };
}

export interface RoleRecord extends TenantScopedRecord {
  name: UserRoleName;
  description: string;
  permissions: string[];
  is_system: boolean;
}

export interface DepartmentRecord extends AuditableRecord {
  name: string;
  code: string;
  parent_department_id?: DatabaseId | null;
  manager_id?: DatabaseId | null;
  headcount: number;
  status: DepartmentStatus;
}

export interface UserRecord extends AuditableRecord {
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role_id: DatabaseId;
  department_id?: DatabaseId | null;
  manager_id?: DatabaseId | null;
  status: "active" | "inactive" | "suspended";
  locale: string;
  last_seen_at?: string | null;
}

export interface PolicyRecord extends AuditableRecord {
  title: string;
  version: string;
  summary: string;
  body: string;
  category: "safety" | "environment" | "security" | "hr" | "operations";
  status: PolicyStatus;
  effective_date: string;
  expiry_date?: string | null;
  owner_user_id?: DatabaseId | null;
}

export interface LearningModuleRecord extends AuditableRecord {
  title: string;
  slug: string;
  description: string;
  category: LearningModuleCategory;
  difficulty: LearningModuleDifficulty;
  estimated_minutes: number;
  thumbnail_url?: string | null;
  policy_id?: DatabaseId | null;
  prerequisite_module_id?: DatabaseId | null;
  is_published: boolean;
}

export interface QuizRecord extends AuditableRecord {
  module_id: DatabaseId;
  title: string;
  type: QuizType;
  passing_score: number;
  time_limit_minutes?: number | null;
  is_active: boolean;
}

export interface QuestionOption {
  id: DatabaseId;
  label: string;
  feedback?: string | null;
  is_correct: boolean;
}

export interface QuestionRecord extends AuditableRecord {
  quiz_id: DatabaseId;
  prompt: string;
  question_type: QuestionType;
  options: QuestionOption[];
  correct_option_ids: DatabaseId[];
  explanation?: string | null;
  difficulty: "easy" | "medium" | "hard";
}

export interface ScenarioChallengeRecord extends AuditableRecord {
  title: string;
  description: string;
  module_id?: DatabaseId | null;
  policy_id?: DatabaseId | null;
  scenario_type: "incident" | "hazard" | "decision";
  difficulty: ScenarioDifficulty;
  prompt: string;
  expected_outcome: string;
  points: number;
}

export interface CertificateRecord extends AuditableRecord {
  user_id: DatabaseId;
  module_id?: DatabaseId | null;
  quiz_id?: DatabaseId | null;
  title: string;
  status: CertificateStatus;
  issued_at?: string | null;
  expires_at?: string | null;
  credential_id?: string | null;
  score?: number | null;
}

export interface ProgressRecord extends TenantScopedRecord {
  user_id: DatabaseId;
  module_id: DatabaseId;
  quiz_id?: DatabaseId | null;
  status: ProgressStatus;
  completion_percentage: number;
  score?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_activity_at?: string | null;
  xp_earned: number;
}

export interface AchievementRecord extends AuditableRecord {
  user_id: DatabaseId;
  title: string;
  category: AchievementCategory;
  description: string;
  icon_url?: string | null;
  earned_at: string;
  xp_value: number;
  badge_code: string;
}

export interface XpEventRecord extends BaseRecord {
  company_id: DatabaseId;
  user_id: DatabaseId;
  source: XpSource;
  amount: number;
  reason: string;
  related_entity_type?: "quiz" | "module" | "certificate" | "scenario" | "achievement" | null;
  related_entity_id?: DatabaseId | null;
}

export interface NotificationRecord extends BaseRecord {
  company_id: DatabaseId;
  user_id: DatabaseId;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  action_url?: string | null;
}

export interface AuditLogRecord extends BaseRecord {
  company_id: DatabaseId;
  actor_user_id?: DatabaseId | null;
  actor_role?: UserRoleName | null;
  entity_type: "company" | "user" | "policy" | "module" | "quiz" | "certificate" | "progress" | "achievement" | "notification";
  entity_id: DatabaseId;
  action: AuditAction;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
}

export interface AiGeneratedContentRecord extends AuditableRecord {
  company_id: DatabaseId;
  created_by_user_id?: DatabaseId | null;
  entity_type: "policy" | "module" | "quiz" | "scenario" | "notification";
  entity_id?: DatabaseId | null;
  prompt: string;
  output: string;
  model_name: string;
  status: AiContentStatus;
  confidence_score?: number | null;
}

export interface ReadOnlyRepository<T, TFilters = Record<string, unknown>> {
  getById(id: DatabaseId): Promise<T | null>;
  list(filters?: TFilters): Promise<T[]>;
  getByCompany(companyId: DatabaseId): Promise<T[]>;
}

export type CompanyRepository = ReadOnlyRepository<CompanyRecord>;
export type UserRepository = ReadOnlyRepository<UserRecord>;
export type RoleRepository = ReadOnlyRepository<RoleRecord>;
export type DepartmentRepository = ReadOnlyRepository<DepartmentRecord>;
export type PolicyRepository = ReadOnlyRepository<PolicyRecord>;
export type LearningModuleRepository = ReadOnlyRepository<LearningModuleRecord>;
export type QuizRepository = ReadOnlyRepository<QuizRecord>;
export type QuestionRepository = ReadOnlyRepository<QuestionRecord>;
export type ScenarioChallengeRepository = ReadOnlyRepository<ScenarioChallengeRecord>;
export type CertificateRepository = ReadOnlyRepository<CertificateRecord>;
export type ProgressRepository = ReadOnlyRepository<ProgressRecord>;
export type AchievementRepository = ReadOnlyRepository<AchievementRecord>;
export type XpEventRepository = ReadOnlyRepository<XpEventRecord>;
export type NotificationRepository = ReadOnlyRepository<NotificationRecord>;
export type AuditLogRepository = ReadOnlyRepository<AuditLogRecord>;
export type AiGeneratedContentRepository = ReadOnlyRepository<AiGeneratedContentRecord>;
