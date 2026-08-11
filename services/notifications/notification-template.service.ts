import type { NotificationEventType, NotificationTemplate } from "@/types/notifications";

const templates: NotificationTemplate[] = [
  {
    key: "CampaignPublished",
    title: "New campaign published",
    body: "A new safety campaign is live. Employees assigned to this campaign can start their first mission today.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
  },
  {
    key: "DailyMissionAvailable",
    title: "Your mission is ready",
    body: "Your mission for today is available. Complete it to keep your campaign on track.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
  },
  {
    key: "MissionStarted",
    title: "Mission started",
    body: "Keep going — your mission has begun and progress is being tracked.",
    defaultChannels: ["IN_APP"],
    priority: "LOW",
  },
  {
    key: "MissionCompleted",
    title: "Mission completed",
    body: "Great work! Your mission is complete. Keep momentum to finish the campaign.",
    defaultChannels: ["IN_APP"],
    priority: "LOW",
  },
  {
    key: "MissionMissed",
    title: "Mission missed",
    body: "You missed yesterday's mission. Complete today’s mission to get back on track.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
  },
  {
    key: "EmployeeAtRisk",
    title: "Training risk detected",
    body: "You're falling behind on your campaign. Complete today’s mission to stay on track.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "CRITICAL",
  },
  {
    key: "EmployeeBackOnTrack",
    title: "Back on track",
    body: "Nice work. You're back on track with your campaign.",
    defaultChannels: ["IN_APP"],
    priority: "NORMAL",
  },
  {
    key: "CampaignDeadlineApproaching",
    title: "Campaign deadline approaching",
    body: "The campaign deadline is approaching. Help your team finish the necessary missions.",
    defaultChannels: ["EMAIL"],
    priority: "HIGH",
  },
  {
    key: "CampaignCompleted",
    title: "Campaign completed",
    body: "Congratulations! The campaign is complete and certificates are being issued.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
  },
  {
    key: "CertificateIssued",
    title: "Certificate issued",
    body: "Your certificate is ready. View it in your profile when you're ready.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "NORMAL",
  },
  {
    key: "CertificateExpiring",
    title: "Certificate expiring soon",
    body: "Your certificate expires in 30 days. Plan renewal training to stay compliant.",
    defaultChannels: ["IN_APP", "EMAIL"],
    priority: "HIGH",
  },
  {
    key: "CertificateExpired",
    title: "Certificate expired",
    body: "A certificate has expired. Complete the required training to renew compliance.",
    defaultChannels: ["EMAIL"],
    priority: "CRITICAL",
  },
  {
    key: "EmployeeInvited",
    title: "You've been invited",
    body: "You were invited to join SafetyXP. Complete your profile and start your first mission.",
    defaultChannels: ["EMAIL"],
    priority: "NORMAL",
  },
  {
    key: "WeeklyComplianceSummary",
    title: "Weekly compliance summary",
    body: "Your weekly compliance summary is ready. Check recent completion, risk, and certificate activity.",
    defaultChannels: ["EMAIL"],
    priority: "LOW",
  },
];

export function getNotificationTemplate(eventType: NotificationEventType): NotificationTemplate | undefined {
  return templates.find((template) => template.key === eventType);
}

export function getNotificationTemplates(): NotificationTemplate[] {
  return templates;
}
