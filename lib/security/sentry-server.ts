import "server-only";

import * as Sentry from "@sentry/nextjs";

const allowedTagKeys = new Set([
  "component",
  "operation",
  "failure_scope",
  "job_name",
  "channel",
  "provider",
  "file_type",
  "outcome",
  "error_code",
  "attempt",
  "runtime",
  "job_id",
]);

export type SentryTechnicalContext = Partial<Record<
  "component" | "operation" | "failure_scope" | "job_name" | "channel" | "provider" | "file_type" | "outcome" | "error_code" | "attempt" | "runtime" | "job_id",
  string | number
>>;

function sanitizeError(error: unknown, component: string) {
  const safeError = new Error(`SafetyXP ${component} operation failed.`);

  if (error instanceof Error && error.stack) {
    safeError.stack = error.stack.replace(/^[^\n]*/, safeError.message);
  }

  return safeError;
}

export function reportServerError(error: unknown, context: SentryTechnicalContext) {
  const tags = Object.fromEntries(
    Object.entries(context)
      .filter(([key, value]) => allowedTagKeys.has(key) && value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
  const component = typeof tags.component === "string" ? tags.component : "server";

  Sentry.withScope((scope) => {
    scope.setTags(tags);
    Sentry.captureException(sanitizeError(error, component));
  });
}