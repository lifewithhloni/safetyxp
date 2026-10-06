import { NextResponse } from "next/server";
import { executeCronJob, isCronAuthError, reportCronJobFailure, requireCronSecret } from "@/services/automation/scheduler.service";
import { processRiskAlerts } from "@/services/automation/automation.service";

export async function POST(request: Request) {
  try {
    requireCronSecret(request);
    const result = await executeCronJob("risk-analysis", () => processRiskAlerts());
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (isCronAuthError(error)) {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }

    reportCronJobFailure(error, "risk-analysis");
    return NextResponse.json({ ok: false, error: "Cron job failed." }, { status: 500 });
  }
}
