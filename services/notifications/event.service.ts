import type { NotificationEvent } from "@/types/notifications";

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
      console.error("Notification event listener failed:", error);
    }
  });
}
