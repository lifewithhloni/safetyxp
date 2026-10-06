import type { NotificationEvent } from "@/types/notifications";
import { reportServerError } from "@/lib/security/sentry-server";

const listeners: Array<(event: NotificationEvent) => void> = [];

export function subscribeToNotificationEvents(listener: (event: NotificationEvent) => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}

export function dispatchNotificationEvent(event: NotificationEvent) {
  listeners.slice().forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      reportServerError(error, {
        component: "notification_events",
        operation: "dispatch_listener",
        failure_scope: "listener",
      });
    }
  });
}
