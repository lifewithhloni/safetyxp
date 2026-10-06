import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Sentry capture boundaries", () => {
  it("keeps cron and API reporting at explicit terminal boundaries", () => {
    for (const route of ["daily-missions", "process-notifications", "risk-analysis", "certificate-expiry", "deadline-reminders", "weekly-summary"]) {
      const routeSource = source(`app/api/cron/${route}/route.ts`);
      expect(routeSource).toContain("reportCronJobFailure(error");
      expect(routeSource).toContain("if (isCronAuthError(error))");
    }

    expect(source("app/api/ai/generate/route.ts")).toContain('reportUnexpectedApiError(error, "generate_ai_content")');
    expect(source("app/api/policies/[policyId]/documents/upload/route.ts")).toContain('reportUnexpectedApiError(error, "upload_policy_document")');
  });

  it("captures swallowed background failures only at their owning service boundaries", () => {
    expect(source("services/automation/automation.service.ts")).toContain("failure_scope: \"item\"");
    expect(source("services/automation/automation.service.ts")).toContain("failure_scope: \"company\"");
    expect(source("services/ai/ai-job.service.ts")).toContain('failure_scope: "background_job"');
    expect(source("services/ai/document-analysis.service.ts")).toContain('failure_scope: "extraction"');
    expect(source("services/notifications/notification-queue.service.ts")).toContain('component: "notification_queue"');
    expect(source("services/notifications/event.service.ts")).toContain('component: "notification_events"');
    expect(source("services/email/providers/resend.provider.ts")).not.toContain("reportServerError");
  });

  it("retains only allowlisted server tags while stripping sensitive event data", () => {
    for (const config of ["sentry.server.config.ts", "sentry.edge.config.ts"]) {
      const configSource = source(config);
      expect(configSource).toContain("event.tags = Object.fromEntries");
      expect(configSource).toContain("delete event.request");
      expect(configSource).toContain("delete event.user");
      expect(configSource).toContain("delete event.extra");
      expect(configSource).toContain("delete event.contexts");
      expect(configSource).toContain("delete event.breadcrumbs");
    }
  });
});