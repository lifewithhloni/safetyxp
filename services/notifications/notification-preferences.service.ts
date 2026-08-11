import type { NotificationPreference } from "@/types/notifications";

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
