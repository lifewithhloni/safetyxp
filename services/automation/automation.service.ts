import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/security/sentry-server";
import { CRON_JOB_BATCH_LIMIT, getDaysUntil, startOfCompanyDay } from "@/services/automation/scheduler.service";
import { dispatchNotificationEvent } from "@/services/notifications/event.service";
import { processNotificationQueue, queueNotificationEvent } from "@/services/notifications/notification-queue.service";
import type { NotificationEvent } from "@/types/notifications";

type CampaignRef = {
  id: string;
  company_id: string;
  name: string;
  official_deadline?: string;
  learning_deadline?: string;
};

type ProfileRef = {
  id: string;
  email: string | null;
  first_name?: string | null;
  role?: string | null;
};

type DailyMissionRow = {
  id: string;
  campaign_id: string;
  employee_id: string;
  scheduled_date: string;
  status: string;
  title: string;
  estimated_minutes: number | null;
  campaigns: CampaignRef | CampaignRef[] | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

type CertificateExpiryRow = {
  id: string;
  company_id: string;
  employee_id: string;
  expires_at: string | null;
  status: string;
  profiles: ProfileRef | ProfileRef[] | null;
};

type ParticipantRow = {
  employee_id: string;
  status: string;
  campaigns: CampaignRef | CampaignRef[] | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

type AdminRow = {
  id: string;
  company_id: string;
  email: string | null;
  first_name: string | null;
  role: string;
};

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getCompanyTimezone(companyId: string) {
  const { data } = await supabaseAdmin.from("companies").select("timezone").eq("id", companyId).maybeSingle();
  return data?.timezone ?? "UTC";
}

async function emitNotification(event: NotificationEvent, email?: string | null, includeInApp = true) {
  dispatchNotificationEvent(event);

  if (includeInApp) {
    await queueNotificationEvent(event, "IN_APP");
  }

  if (email) {
    await queueNotificationEvent(event, "EMAIL", email);
  }
}

export async function processDailyMissions() {
  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("daily_missions")
    .select(`
      id,
      campaign_id,
      employee_id,
      scheduled_date,
      status,
      title,
      estimated_minutes,
      campaigns(id, company_id, name),
      profiles(id, email, first_name, role)
    `)
    .eq("status", "scheduled")
    .limit(CRON_JOB_BATCH_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as DailyMissionRow[];
  let sent = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const mission of records) {
    processed += 1;

    try {
      const campaign = unwrapOne(mission.campaigns);
      const profile = unwrapOne(mission.profiles);

      if (!campaign || !profile?.email || profile.role !== "employee") {
        skipped += 1;
        continue;
      }

      const timezone = await getCompanyTimezone(campaign.company_id);
      if (mission.scheduled_date !== startOfCompanyDay(now, timezone)) {
        skipped += 1;
        continue;
      }

      const event: NotificationEvent = {
        id: `daily-mission-${mission.id}-${mission.employee_id}-${mission.scheduled_date}`,
        eventType: "DailyMissionAvailable",
        companyId: campaign.company_id,
        createdAt: new Date().toISOString(),
        payload: {
          companyId: campaign.company_id,
          userId: mission.employee_id,
          campaignId: campaign.id,
          title: "Your SafetyXP mission is ready",
          body: `Today's mission: ${campaign.name} - ${mission.title}. Estimated time: ${mission.estimated_minutes ?? 0} minutes.`,
          actionUrl: appUrl("/today"),
          email: profile.email,
        },
      };

      await emitNotification(event, profile.email, true);
      sent += 1;
      succeeded += 1;
    } catch (error) {
      reportServerError(error, { component: "cron", job_name: "daily-missions", failure_scope: "item", operation: "queue_notification" });
      failed += 1;
    }
  }

  return { sent, processed, succeeded, failed, skipped, limitExceeded: records.length >= CRON_JOB_BATCH_LIMIT };
}

export async function processRiskAlerts() {
  const { getAiEnrichedRiskReport } = await import("@/services/ai/ai-risk-analysis.service");

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from("companies")
    .select("id")
    .limit(CRON_JOB_BATCH_LIMIT);

  if (companiesError || !companies) {
    throw new Error("Failed to fetch companies for risk analysis.");
  }

  const companiesBatch = companies.slice(0, CRON_JOB_BATCH_LIMIT);
  let sent = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let companyFailures = 0;
  const groupedByCompany = new Map<string, typeof atRiskAll>();
  type AtRiskItem = Awaited<ReturnType<typeof getAiEnrichedRiskReport>>[number];
  const atRiskAll: AtRiskItem[] = [];

  for (const company of companiesBatch) {
    try {
      const results = await getAiEnrichedRiskReport(company.id);
      const atRisk = results.filter(
        (item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL"
      );

      for (const employee of atRisk) {
        processed += 1;

        try {
          if (!employee.email) {
            skipped += 1;
            continue;
          }

          const event: NotificationEvent = {
            id: `risk-${employee.employeeId}-${employee.campaignId}-${employee.riskLevel}`,
            eventType: "EmployeeAtRisk",
            companyId: employee.companyId,
            createdAt: new Date().toISOString(),
            payload: {
              companyId: employee.companyId,
              userId: employee.employeeId,
              campaignId: employee.campaignId,
              riskLevel: employee.riskLevel,
              title: "Training risk detected",
              body: employee.aiInsight?.topRecommendation
                ?? `You are falling behind on ${employee.campaignName}. Complete today's mission to get back on track.`,
              actionUrl: appUrl("/today"),
              email: employee.email,
            },
          };

          await emitNotification(event, employee.email, true);
          sent += 1;
          succeeded += 1;

          const bucket = groupedByCompany.get(employee.companyId) ?? [];
          bucket.push(employee);
          groupedByCompany.set(employee.companyId, bucket);
          atRiskAll.push(employee);
        } catch (error) {
          reportServerError(error, { component: "cron", job_name: "risk-analysis", failure_scope: "item", operation: "queue_notification" });
          failed += 1;
        }
      }
    } catch (error) {
      reportServerError(error, { component: "cron", job_name: "risk-analysis", failure_scope: "company", operation: "generate_risk_report" });
      companyFailures += 1;
    }
  }

  for (const [companyId, employees] of groupedByCompany.entries()) {
    try {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("company_id", companyId)
        .in("role", ["admin", "super_admin"])
        .limit(CRON_JOB_BATCH_LIMIT);

      for (const admin of admins ?? []) {
        processed += 1;

        try {
          if (!admin.email) {
            skipped += 1;
            continue;
          }

          const event: NotificationEvent = {
            id: `manager-risk-${companyId}-${admin.id}-${employees.length}`,
            eventType: "ManagerComplianceAlert",
            companyId,
            createdAt: new Date().toISOString(),
            payload: {
              companyId,
              userId: admin.id,
              title: "Employees at risk",
              body: `${employees.length} employees are at risk of missing a training deadline. Review the affected campaigns and intervene early.`,
              actionUrl: appUrl("/admin/reports"),
              email: admin.email,
            },
          };

          await emitNotification(event, admin.email, false);
          sent += 1;
          succeeded += 1;
        } catch (error) {
          reportServerError(error, { component: "cron", job_name: "risk-analysis", failure_scope: "item", operation: "queue_manager_notification" });
          failed += 1;
        }
      }
    } catch (error) {
      reportServerError(error, { component: "cron", job_name: "risk-analysis", failure_scope: "company", operation: "queue_manager_notification" });
      failed += 1;
    }
  }

  return { sent, processed, succeeded, failed, skipped, companyFailures, limitExceeded: companies.length >= CRON_JOB_BATCH_LIMIT };
}

export async function processDeadlineReminders() {
  const { data, error } = await supabaseAdmin
    .from("campaign_participants")
    .select(`
      employee_id,
      status,
      campaigns(id, company_id, name, official_deadline, learning_deadline),
      profiles(id, email, first_name, role)
    `)
    .neq("status", "completed")
    .limit(CRON_JOB_BATCH_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as ParticipantRow[];
  let sent = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const participant of records) {
    processed += 1;

    try {
      const campaign = unwrapOne(participant.campaigns);
      const profile = unwrapOne(participant.profiles);

      if (!campaign?.company_id || !campaign.learning_deadline || !campaign.official_deadline || !profile?.email) {
        skipped += 1;
        continue;
      }

      const timezone = await getCompanyTimezone(campaign.company_id);
      const learningDays = getDaysUntil(campaign.learning_deadline.slice(0, 10), new Date(), timezone);
      if (![7, 3, 1].includes(learningDays)) {
        skipped += 1;
        continue;
      }

      const event: NotificationEvent = {
        id: `deadline-${campaign.id}-${participant.employee_id}-${learningDays}`,
        eventType: "CampaignDeadlineApproaching",
        companyId: campaign.company_id,
        createdAt: new Date().toISOString(),
        payload: {
          companyId: campaign.company_id,
          userId: participant.employee_id,
          campaignId: campaign.id,
          dueDate: campaign.official_deadline,
          title: "Campaign deadline approaching",
          body: `${campaign.name} should be completed by ${campaign.learning_deadline.slice(0, 10)} to stay on track.`,
          actionUrl: appUrl("/today"),
          email: profile.email,
        },
      };

      await emitNotification(event, profile.email, true);
      sent += 1;
      succeeded += 1;
    } catch (error) {
      reportServerError(error, { component: "cron", job_name: "deadline-reminders", failure_scope: "item", operation: "queue_notification" });
      failed += 1;
    }
  }

  return { sent, processed, succeeded, failed, skipped, limitExceeded: records.length >= CRON_JOB_BATCH_LIMIT };
}

export async function processCertificateExpiry() {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      id,
      company_id,
      employee_id,
      expires_at,
      status,
      profiles(id, email, first_name, role)
    `)
    .eq("status", "issued")
    .limit(CRON_JOB_BATCH_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as CertificateExpiryRow[];
  let sent = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const certificate of records) {
    processed += 1;

    try {
      if (!certificate.expires_at) {
        skipped += 1;
        continue;
      }

      const profile = unwrapOne(certificate.profiles);
      if (!profile?.email) {
        skipped += 1;
        continue;
      }

      const timezone = await getCompanyTimezone(certificate.company_id);
      const daysUntil = getDaysUntil(certificate.expires_at.slice(0, 10), new Date(), timezone);
      if (![30, 7, 1].includes(daysUntil)) {
        skipped += 1;
        continue;
      }

      const event: NotificationEvent = {
        id: `certificate-expiry-${certificate.id}-${daysUntil}`,
        eventType: "CertificateExpiring",
        companyId: certificate.company_id,
        createdAt: new Date().toISOString(),
        payload: {
          companyId: certificate.company_id,
          userId: certificate.employee_id,
          certificateId: certificate.id,
          daysUntilExpiry: daysUntil,
          title: "Certificate expiring soon",
          body: `Your certificate expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
          actionUrl: appUrl("/certificates"),
          email: profile.email,
        },
      };

      await emitNotification(event, profile.email, true);
      sent += 1;
      succeeded += 1;
    } catch (error) {
      reportServerError(error, { component: "cron", job_name: "certificate-expiry", failure_scope: "item", operation: "queue_notification" });
      failed += 1;
    }
  }

  return { sent, processed, succeeded, failed, skipped, limitExceeded: records.length >= CRON_JOB_BATCH_LIMIT };
}

export async function processWeeklySummaries() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id, email, first_name, role")
    .in("role", ["admin", "super_admin"])
    .limit(CRON_JOB_BATCH_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as AdminRow[];
  let sent = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const admin of records) {
    processed += 1;

    try {
      if (!admin.email) {
        skipped += 1;
        continue;
      }

      const event: NotificationEvent = {
        id: `weekly-summary-${admin.company_id}-${admin.id}-${startOfCompanyDay(new Date(), "UTC")}`,
        eventType: "WeeklyComplianceSummary",
        companyId: admin.company_id,
        createdAt: new Date().toISOString(),
        payload: {
          companyId: admin.company_id,
          userId: admin.id,
          title: "SafetyXP Weekly Compliance Summary",
          body: "Your weekly compliance summary is ready.",
          actionUrl: appUrl("/admin/reports"),
          email: admin.email,
        },
      };

      await emitNotification(event, admin.email, false);
      sent += 1;
      succeeded += 1;
    } catch (error) {
      reportServerError(error, { component: "cron", job_name: "weekly-summary", failure_scope: "item", operation: "queue_notification" });
      failed += 1;
    }
  }

  return { sent, processed, succeeded, failed, skipped, limitExceeded: records.length >= CRON_JOB_BATCH_LIMIT };
}

export { processNotificationQueue };
