import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAutomationRuleByEvent } from "@/services/notifications/notification-rules.service";
import type { NotificationChannel, NotificationEventType, NotificationPreference } from "@/types/notifications";

const defaultPreferences: NotificationPreference = {
  userId: "user_01",
  companyId: "company_01",
  channels: ["IN_APP", "EMAIL"],
  enableDailyMissionReminders: true,
  enableComplianceReminders: true,
  enableCertificateNotifications: true,
  enableAchievementNotifications: true,
  enableWeeklySummary: true,
  mandatoryComplianceEnabled: true,
  updatedAt: new Date().toISOString(),
};

let currentPreferences = { ...defaultPreferences };

export function getNotificationPreferences(userId: string): NotificationPreference {
  if (currentPreferences.userId === userId) {
    return currentPreferences;
  }
  return { ...defaultPreferences, userId };
}

export async function getNotificationPreferencesFromDb(userId: string): Promise<NotificationPreference> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select("user_id, daily_missions, compliance_reminders, certificate_notifications, achievement_notifications, weekly_summary, email_enabled, in_app_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return getDefaultNotificationPreferences(userId);
  }

  return {
    userId: data.user_id,
    companyId: currentPreferences.companyId,
    channels: [data.in_app_enabled ? "IN_APP" : null, data.email_enabled ? "EMAIL" : null].filter(Boolean) as Array<"IN_APP" | "EMAIL">,
    enableDailyMissionReminders: data.daily_missions,
    enableComplianceReminders: data.compliance_reminders,
    enableCertificateNotifications: data.certificate_notifications,
    enableAchievementNotifications: data.achievement_notifications,
    enableWeeklySummary: data.weekly_summary,
    mandatoryComplianceEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}

export function updateNotificationPreferences(preferences: Partial<NotificationPreference> & { userId: string }): NotificationPreference {
  if (preferences.userId !== currentPreferences.userId) {
    currentPreferences = { ...defaultPreferences, ...preferences };
  } else {
    currentPreferences = { ...currentPreferences, ...preferences };
  }
  currentPreferences.updatedAt = new Date().toISOString();
  return currentPreferences;
}

export function getDefaultNotificationPreferences(userId: string): NotificationPreference {
  return { ...defaultPreferences, userId };
}

export function isMandatoryNotification(eventType: NotificationEventType) {
  return Boolean(getAutomationRuleByEvent(eventType)?.mandatory);
}

export function canSendNotificationChannel(preferences: NotificationPreference, eventType: NotificationEventType, channel: NotificationChannel) {
  if (isMandatoryNotification(eventType)) {
    return true;
  }

  if (channel === "EMAIL" && !preferences.channels.includes("EMAIL")) {
    return false;
  }

  if (channel === "IN_APP" && !preferences.channels.includes("IN_APP")) {
    return false;
  }

  switch (eventType) {
    case "DailyMissionAvailable":
    case "MissionMissed":
      return preferences.enableDailyMissionReminders;
    case "EmployeeAtRisk":
    case "EmployeeBackOnTrack":
    case "CampaignDeadlineApproaching":
      return preferences.enableComplianceReminders;
    case "CertificateIssued":
    case "CertificateExpiring":
    case "CertificateExpired":
      return preferences.enableCertificateNotifications;
    case "WeeklyComplianceSummary":
      return preferences.enableWeeklySummary;
    default:
      return true;
  }
}
