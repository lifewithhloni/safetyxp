import { createCampaignSchedule, getTodaysMission, completeMission, generateDailyMissions } from "@/services/scheduling.service";
import { getCampaignById } from "@/services/campaign.service";

describe("scheduling.service", () => {
  it("creates a schedule for a published campaign", () => {
    const campaign = getCampaignById("campaign-fire-safety");
    expect(campaign).toBeDefined();

    const missions = createCampaignSchedule("campaign-fire-safety");
    expect(missions.length).toBeGreaterThan(0);
    expect(missions.every((mission) => mission.campaignId === "campaign-fire-safety")).toBe(true);
    expect(new Set(missions.map((mission) => mission.employeeId)).size).toBeGreaterThan(0);
  });

  it("returns today’s mission for a given employee when scheduled", () => {
    const referenceDate = new Date("2026-07-15");
    generateDailyMissions("campaign-fire-safety", referenceDate);

    const mission = getTodaysMission("emp-001", referenceDate);
    expect(mission).not.toBeNull();
    expect(mission?.employeeId).toBe("emp-001");
    expect(mission?.scheduledDate).toBe("2026-07-15");
  });

  it("marks a mission complete and preserves completion state", () => {
    const referenceDate = new Date("2026-07-15");
    generateDailyMissions("campaign-fire-safety", referenceDate);

    const mission = getTodaysMission("emp-001", referenceDate);
    expect(mission).not.toBeNull();
    expect(mission?.status).toBe("Not Started");

    const completed = completeMission(mission!.id);
    expect(completed).toBeDefined();
    expect(completed?.status).toBe("Completed");
    expect(completed?.completedAt).toBeDefined();
  });
});
