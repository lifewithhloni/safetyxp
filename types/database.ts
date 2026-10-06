export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DatabaseRole = "employee" | "admin" | "super_admin";
export type PolicyStatus = "draft" | "active" | "archived";
export type CampaignStatus = "draft" | "published" | "active" | "completed" | "archived";
export type LearningModuleStatus = "draft" | "published" | "archived";
export type MissionStatus = "scheduled" | "in_progress" | "completed" | "missed" | "overdue";
export type CertificateStatus = "eligible" | "generating" | "issued" | "expired" | "revoked" | "failed";
export type GeneratedContentStatus = "QUEUED" | "ANALYZING" | "GENERATING" | "VALIDATING" | "AI_GENERATED" | "UNDER_REVIEW" | "READY_FOR_REVIEW" | "FAILED" | "APPROVED" | "REJECTED" | "PUBLISHED";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH" | "SMS" | "TEAMS" | "SLACK";
export type NotificationStatus = "pending" | "sent" | "read" | "failed";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: DatabaseRole;
  job_title: string | null;
  department_id: string | null;
  employee_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type Department = {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
};

type Policy = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: PolicyStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PolicyDocument = {
  id: string;
  policy_id: string;
  company_id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  page_count: number | null;
  extracted_text: string | null;
  processing_status: string;
  created_at: string;
};

type Campaign = {
  id: string;
  company_id: string;
  policy_id: string | null;
  name: string;
  description: string | null;
  official_deadline: string;
  learning_deadline: string;
  buffer_days: number;
  status: CampaignStatus;
  required_lesson_completion: boolean;
  required_quiz_completion: boolean;
  required_scenario_completion: boolean;
  requires_final_assessment: boolean;
  minimum_quiz_score: number;
  minimum_final_assessment_score: number;
  certificate_expiry_days: number | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignParticipant = {
  id: string;
  campaign_id: string;
  employee_id: string;
  assigned_at: string;
  status: string;
  completion_percentage: number;
  completed_at: string | null;
};

type LearningModule = {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  content: string | null;
  estimated_minutes: number | null;
  order_index: number;
  status: LearningModuleStatus;
  source_document_id: string | null;
  source_reference: string | null;
  created_at: string;
};

type DailyMission = {
  id: string;
  campaign_id: string;
  employee_id: string;
  module_id: string | null;
  scheduled_date: string;
  type: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  order_index: number;
  status: MissionStatus;
  xp_reward: number;
  completed_at: string | null;
  created_at: string;
};

type MissionProgress = {
  id: string;
  mission_id: string;
  employee_id: string;
  started_at: string | null;
  completed_at: string | null;
  status: MissionStatus;
  score: number | null;
};

type QuizQuestion = {
  id: string;
  campaign_id: string;
  module_id: string | null;
  question: string;
  options: Json;
  correct_answer: string;
  explanation: string | null;
  difficulty: string | null;
  xp_reward: number;
  status: string;
  source_document_id: string | null;
  source_reference: string | null;
  created_at: string;
};

type Scenario = {
  id: string;
  campaign_id: string;
  module_id: string | null;
  title: string;
  situation: string;
  options: Json;
  correct_response: string;
  explanation: string | null;
  learning_objective: string | null;
  xp_reward: number;
  status: string;
  source_document_id: string | null;
  source_reference: string | null;
  created_at: string;
};

type Flashcard = {
  id: string;
  campaign_id: string;
  module_id: string | null;
  front: string;
  back: string;
  category: string | null;
  difficulty: string | null;
  status: string;
  source_document_id: string | null;
  source_reference: string | null;
  created_at: string;
};

type Certificate = {
  id: string;
  company_id: string;
  employee_id: string;
  campaign_id: string | null;
  certificate_number: string;
  issued_at: string | null;
  expires_at: string | null;
  status: CertificateStatus;
  verification_code: string;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeXp = {
  id: string;
  employee_id: string;
  total_xp: number;
  current_level: number;
  updated_at: string;
};

type Achievement = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  created_at: string;
};

type EmployeeAchievement = {
  id: string;
  employee_id: string;
  achievement_id: string;
  earned_at: string;
};

type NotificationRow = {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  status: NotificationStatus;
  read_at: string | null;
  created_at: string;
};

type NotificationPreference = {
  id: string;
  user_id: string;
  daily_missions: boolean;
  compliance_reminders: boolean;
  certificate_notifications: boolean;
  achievement_notifications: boolean;
  weekly_summary: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
};

type NotificationDelivery = {
  id: string;
  notification_id: string;
  company_id: string;
  recipient: string;
  channel: string;
  provider: string;
  status: string;
  attempts: number;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

type AutomationRule = {
  id: string;
  company_id: string;
  name: string;
  trigger: string;
  audience: string[];
  channel: string[];
  frequency: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type CronJobLock = {
  id: string;
  job_name: string;
  owner_token: string;
  lease_expires_at: string;
  acquired_at: string;
  updated_at: string;
};

type GeneratedContent = {
  id: string;
  company_id: string;
  policy_id: string | null;
  campaign_id: string | null;
  content_type: string;
  content: Json;
  status: GeneratedContentStatus;
  source_document_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ContentReview = {
  id: string;
  generated_content_id: string;
  reviewer_id: string | null;
  status: string;
  notes: string | null;
  reviewed_at: string | null;
};

type AuditLog = {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Json;
  created_at: string;
};

type AiGenerationJob = {
  id: string;
  company_id: string;
  policy_id: string;
  policy_document_id: string;
  campaign_id: string | null;
  created_by: string;
  status: GeneratedContentStatus;
  last_message: string | null;
  created_at: string;
  updated_at: string;
};

type AiUsageRecord = {
  id: string;
  company_id: string;
  user_id: string;
  policy_id: string;
  operation: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
};

type EmployeeInvitation = {
  id: string;
  company_id: string;
  employee_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  accepted_at: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invited_by: string;
  created_at: string;
  updated_at: string;
};

type EmployeeImportBatch = {
  id: string;
  company_id: string;
  created_by: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL";
  created_at: string;
  completed_at: string | null;
  updated_at: string;
};

type EmployeeImportError = {
  id: string;
  batch_id: string;
  company_id: string;
  row_number: number;
  field: string;
  error_code: string;
  message: string;
  row_data: Json;
  created_at: string;
};

type QuizAnswer = {
  id: string;
  company_id: string;
  employee_id: string;
  campaign_id: string;
  mission_id: string | null;
  quiz_question_id: string;
  selected_answer: string;
  is_correct: boolean;
  score: number;
  attempt: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ScenarioAnswer = {
  id: string;
  company_id: string;
  employee_id: string;
  campaign_id: string;
  mission_id: string | null;
  scenario_id: string;
  selected_response: string;
  is_correct: boolean;
  score: number;
  attempt: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DatabaseSchema = {
  companies: Company;
  profiles: Profile;
  departments: Department;
  policies: Policy;
  policy_documents: PolicyDocument;
  campaigns: Campaign;
  campaign_participants: CampaignParticipant;
  learning_modules: LearningModule;
  daily_missions: DailyMission;
  mission_progress: MissionProgress;
  quiz_questions: QuizQuestion;
  scenarios: Scenario;
  flashcards: Flashcard;
  certificates: Certificate;
  employee_xp: EmployeeXp;
  achievements: Achievement;
  employee_achievements: EmployeeAchievement;
  notifications: NotificationRow;
  notification_deliveries: NotificationDelivery;
  notification_preferences: NotificationPreference;
  automation_rules: AutomationRule;
  cron_job_locks: CronJobLock;
  generated_content: GeneratedContent;
  content_reviews: ContentReview;
  audit_logs: AuditLog;
  ai_generation_jobs: AiGenerationJob;
  ai_usage_records: AiUsageRecord;
  employee_invitations: EmployeeInvitation;
  employee_import_batches: EmployeeImportBatch;
  employee_import_errors: EmployeeImportError;
  quiz_answers: QuizAnswer;
  scenario_answers: ScenarioAnswer;
};
