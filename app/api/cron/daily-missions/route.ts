import { NextResponse } from "next/server";
import { executeCronJob, isCronAuthError, reportCronJobFailure, requireCronSecret } from "@/services/automation/scheduler.service";
import { processDailyMissions } from "@/services/automation/automation.service";

export async function POST(request: Request) {
  try {
    requireCronSecret(request);
    const result = await executeCronJob("daily-missions", () => processDailyMissions());
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (isCronAuthError(error)) {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }

    reportCronJobFailure(error, "daily-missions");
    return NextResponse.json({ ok: false, error: "Cron job failed." }, { status: 500 });
  }
}
