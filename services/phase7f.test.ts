import { describe, expect, it } from "@jest/globals";
import { calculateLearningDeadline, createCampaignPlan, normalizeCampaignStatus } from "./campaigns/campaign.service";
import { createMissionSchedule, getTodaysMission, ensureMissionCompletion } from "./missions/mission.service";
import { awardXP, getEmployeeXP, calculateLevel } from "./gamification/xp.service";

describe("phase 7F campaign, missions and xp", () => {
  it("calculates a learning deadline from the official deadline and buffer", () => {
    expect(calculateLearningDeadline("2026-09-30", 2)).toBe("2026-09-28");
  });

  it("creates a campaign plan with ordered modules and deterministic mission generation", () => {
    const plan = createCampaignPlan({
      companyId: "company-a",
      name: "Fire Safety",
      officialDeadline: "2026-09-30",
      bufferDays: 2,
      modules: [
        { id: "m-1", title: "Lesson 1", estimatedMinutes: 8, orderIndex: 1, type: "lesson" },
        { id: "m-2", title: "Quiz 1", estimatedMinutes: 10, orderIndex: 2, type: "quiz" },
        { id: "m-3", title: "Scenario", estimatedMinutes: 12, orderIndex: 3, type: "scenario" },
      ],
    });

    expect(plan.learningDeadline).toBe("2026-09-28");
    expect(plan.modules.map((module) => module.orderIndex)).toEqual([1, 2, 3]);
  });

  it("builds a mission schedule without duplicate daily missions", () => {
    const schedule = createMissionSchedule({
      campaignId: "campaign-1",
      employeeId: "employee-1",
      learningDeadline: "2026-09-28",
      modules: [
        { id: "m-1", title: "Lesson 1", estimatedMinutes: 8, orderIndex: 1 },
        { id: "m-2", title: "Quiz 1", estimatedMinutes: 8, orderIndex: 2 },
        { id: "m-3", title: "Scenario 1", estimatedMinutes: 10, orderIndex: 3 },
      ],
      startDate: "2026-09-20",
    });

    expect(schedule.length).toBeGreaterThan(0);
    expect(new Set(schedule.map((mission) => `${mission.employeeId}:${mission.moduleId}`)).size).toBe(schedule.length);
  });

  it("awards XP once and calculates the employee level", () => {
    const first = awardXP({ employeeId: "employee-1", amount: 150, reason: "lesson-complete", missionKey: "mission-1" });
    const second = awardXP({ employeeId: "employee-1", amount: 150, reason: "lesson-complete", missionKey: "mission-1" });

    expect(first.totalXp).toBe(150);
    expect(second.totalXp).toBe(150);
    expect(second.awarded).toBe(false);
    expect(getEmployeeXP("employee-1")).toBe(150);
    expect(calculateLevel(150)).toBe(2);
  });

  it("marks a mission complete and keeps the mission status consistent", () => {
    const mission = ensureMissionCompletion({
      missionId: "mission-1",
      employeeId: "employee-1",
      status: "completed",
      xpAwarded: 10,
    });

    expect(mission.status).toBe("completed");
    expect(mission.completedAt).toBeTruthy();
  });

  it("returns the current mission for the employee on the active day", () => {
    const today = getTodaysMission({
      employeeId: "employee-1",
      date: "2026-09-20",
      schedule: [
        { id: "mission-1", employeeId: "employee-1", campaignId: "campaign-1", moduleId: "m-1", title: "Lesson 1", scheduledDate: "2026-09-20", type: "lesson", status: "scheduled", estimatedMinutes: 8, orderIndex: 1, xpReward: 10 },
        { id: "mission-2", employeeId: "employee-1", campaignId: "campaign-1", moduleId: "m-2", title: "Quiz 1", scheduledDate: "2026-09-21", type: "quiz", status: "scheduled", estimatedMinutes: 8, orderIndex: 2, xpReward: 20 },
      ],
    });

    expect(today?.id).toBe("mission-1");
  });

  it("normalizes campaign statuses", () => {
    expect(normalizeCampaignStatus("published")).toBe("PUBLISHED");
    expect(normalizeCampaignStatus("DRAFT")).toBe("DRAFT");
    expect(normalizeCampaignStatus("active")).toBe("READY");
  });
});
