// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

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
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
