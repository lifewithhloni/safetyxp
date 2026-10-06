import type { DatabaseId } from "./safetyxp-db";

export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH" | "SMS" | "TEAMS" | "SLACK";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "READ" | "CANCELLED";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationAudience = "EMPLOYEE" | "MANAGER" | "ADMIN" | "HR" | "ALL";

export type NotificationEventType =
  | "CampaignPublished"
  | "DailyMissionAvailable"
  | "MissionStarted"
  | "MissionCompleted"
  | "MissionMissed"
  | "EmployeeAtRisk"
  | "EmployeeBackOnTrack"
  | "CampaignDeadlineApproaching"
  | "CampaignCompleted"
  | "CertificateEligible"
  | "CertificateIssued"
  | "CertificateExpiring"
  | "CertificateExpired"
  | "EmployeeInvited"
  | "ManagerComplianceAlert"
  | "WeeklyComplianceSummary";

export type NotificationDeliveryStatus = "QUEUED" | "SENDING" | "SENT" | "DELIVERED" | "FAILED" | "CANCELLED";

export interface NotificationPayload {
  companyId: DatabaseId;
  userId?: DatabaseId;
  managerId?: DatabaseId;
  campaignId?: string;
  certificateId?: string;
  moduleId?: string;
  eventId?: string;
  title?: string;
  body?: string;
  daysUntilExpiry?: number;
  dueDate?: string;
  riskLevel?: string;
  completionRate?: number;
  team?: string;
  summary?: string;
  actionUrl?: string;
  [key: string]: unknown;
}

export interface NotificationTemplate {
  key: NotificationEventType;
  title: string;
  body: string;
  defaultChannels: NotificationChannel[];
  priority: NotificationPriority;
}

export interface Notification {
  id: string;
  companyId: DatabaseId;
  userId: DatabaseId;
  eventId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreference {
  userId: DatabaseId;
  companyId: DatabaseId;
  channels: Array<"IN_APP" | "EMAIL">;
  enableDailyMissionReminders: boolean;
  enableComplianceReminders: boolean;
  enableCertificateNotifications: boolean;
  enableAchievementNotifications: boolean;
  enableWeeklySummary: boolean;
  mandatoryComplianceEnabled: true;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  eventType: NotificationEventType;
  description: string;
  audience: NotificationAudience[];
  channels: NotificationChannel[];
  frequency: "once" | "daily" | "weekly" | "once_per_campaign" | "once_per_risk_event";
  enabled: boolean;
  mandatory: boolean;
  priority: NotificationPriority;
}

export interface NotificationEvent {
  id: string;
  eventType: NotificationEventType;
  companyId: DatabaseId;
  createdAt: string;
  payload: NotificationPayload;
}

export interface NotificationProviderResponse {
  success: boolean;
  provider: string;
  channel: NotificationChannel;
  timestamp: string;
  reason?: string;
}

export interface NotificationAuditRecord {
  id: string;
  notificationId: string;
  eventId: string;
  userId: DatabaseId;
  companyId: DatabaseId;
  type: NotificationEventType;
  channel: NotificationChannel;
  createdAt: string;
  status: NotificationStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryRecord {
  id: string;
  notificationId: string;
  companyId: DatabaseId;
  recipient: string;
  channel: NotificationChannel;
  provider: string;
  status: NotificationDeliveryStatus;
  attempts: number;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  errorCode?: string | null;
  createdAt: string;
  updatedAt: string;
}
