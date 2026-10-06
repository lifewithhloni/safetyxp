// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const allowedTags = new Set(["component", "operation", "failure_scope", "job_name", "channel", "provider", "file_type", "outcome", "error_code", "attempt", "runtime", "job_id"]);

Sentry.init({
  dsn: "https://bd74f54ac4dae6b279bbe4c6a0fb30a1@o4512016090791936.ingest.de.sentry.io/4512016138371152",

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  beforeSend(event) {
    delete event.request;
    delete event.user;
    delete event.extra;
    delete event.contexts;
    delete event.breadcrumbs;
    event.tags = Object.fromEntries(Object.entries(event.tags ?? {}).filter(([key]) => allowedTags.has(key)));
    return event;
  },
});
