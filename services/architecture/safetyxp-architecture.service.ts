import mockData from "@/data/mock/safetyxp.mock.json";
import type {
  AchievementRecord,
  AuditLogRecord,
  AiGeneratedContentRecord,
  CertificateRecord,
  CompanyRecord,
  DepartmentRecord,
  LearningModuleRecord,
  NotificationRecord,
  PolicyRecord,
  ProgressRecord,
  QuestionRecord,
  QuizRecord,
  RoleRecord,
  ScenarioChallengeRecord,
  UserRecord,
  XpEventRecord,
} from "@/types/safetyxp-db";

export interface SafetyXpMockDataSet {
  companies: CompanyRecord[];
  roles: RoleRecord[];
  departments: DepartmentRecord[];
  users: UserRecord[];
  policies: PolicyRecord[];
  learningModules: LearningModuleRecord[];
  quizzes: QuizRecord[];
  questions: QuestionRecord[];
  scenarioChallenges: ScenarioChallengeRecord[];
  certificates: CertificateRecord[];
  progress: ProgressRecord[];
  achievements: AchievementRecord[];
  xpEvents: XpEventRecord[];
  notifications: NotificationRecord[];
  auditLogs: AuditLogRecord[];
  aiGeneratedContent: AiGeneratedContentRecord[];
}

export class SafetyXpArchitectureService {
  constructor(private readonly data: SafetyXpMockDataSet = mockData as SafetyXpMockDataSet) {}

  getCompanies(): CompanyRecord[] {
    return this.data.companies;
  }

  getCompanyById(companyId: string): CompanyRecord | undefined {
    return this.data.companies.find((company) => company.id === companyId);
  }

  getRoles(companyId: string): RoleRecord[] {
    return this.data.roles.filter((role) => role.company_id === companyId);
  }

  getDepartments(companyId: string): DepartmentRecord[] {
    return this.data.departments.filter((department) => department.company_id === companyId);
  }

  getUsers(companyId: string): UserRecord[] {
    return this.data.users.filter((user) => user.company_id === companyId);
  }

  getPolicies(companyId: string): PolicyRecord[] {
    return this.data.policies.filter((policy) => policy.company_id === companyId);
  }

  getLearningModules(companyId: string): LearningModuleRecord[] {
    return this.data.learningModules.filter((module) => module.company_id === companyId);
  }

  getQuizzes(moduleId: string): QuizRecord[] {
    return this.data.quizzes.filter((quiz) => quiz.module_id === moduleId);
  }

  getQuestions(quizId: string): QuestionRecord[] {
    return this.data.questions.filter((question) => question.quiz_id === quizId);
  }

  getScenarioChallenges(companyId: string): ScenarioChallengeRecord[] {
    return this.data.scenarioChallenges.filter((challenge) => challenge.company_id === companyId);
  }

  getCertificates(userId: string): CertificateRecord[] {
    return this.data.certificates.filter((certificate) => certificate.user_id === userId);
  }

  getProgress(userId: string): ProgressRecord[] {
    return this.data.progress.filter((entry) => entry.user_id === userId);
  }

  getAchievements(userId: string): AchievementRecord[] {
    return this.data.achievements.filter((achievement) => achievement.user_id === userId);
  }

  getXpEvents(userId: string): XpEventRecord[] {
    return this.data.xpEvents.filter((event) => event.user_id === userId);
  }

  getNotifications(userId: string): NotificationRecord[] {
    return this.data.notifications.filter((notification) => notification.user_id === userId);
  }

  getAuditLogs(companyId: string): AuditLogRecord[] {
    return this.data.auditLogs.filter((log) => log.company_id === companyId);
  }

  getAiGeneratedContent(companyId: string): AiGeneratedContentRecord[] {
    return this.data.aiGeneratedContent.filter((content) => content.company_id === companyId);
  }
}

export const safetyXpArchitectureService = new SafetyXpArchitectureService();
