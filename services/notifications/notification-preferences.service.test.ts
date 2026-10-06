import { describe, expect, it } from "@jest/globals";
import { canSendNotificationChannel, getDefaultNotificationPreferences, isMandatoryNotification } from "./notification-preferences.service";

describe("notification preferences", () => {
  it("does not allow optional email when email channel is disabled", () => {
    const preferences = {
      ...getDefaultNotificationPreferences("user-1"),
      channels: ["IN_APP"] as Array<"IN_APP" | "EMAIL">,
      enableDailyMissionReminders: true,
    };

    expect(canSendNotificationChannel(preferences, "DailyMissionAvailable", "EMAIL")).toBe(false);
  });

  it("keeps mandatory compliance messages enabled", () => {
    const preferences = {
      ...getDefaultNotificationPreferences("user-1"),
      channels: [] as Array<"IN_APP" | "EMAIL">,
      enableComplianceReminders: false,
    };

    expect(isMandatoryNotification("EmployeeAtRisk")).toBe(true);
    expect(canSendNotificationChannel(preferences, "EmployeeAtRisk", "EMAIL")).toBe(true);
  });
});
