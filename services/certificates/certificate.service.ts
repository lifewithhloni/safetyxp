import { createServerSupabaseClient, getCurrentProfile } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchNotificationEvent } from "@/services/notifications/event.service";
import { buildCertificateRecord, generateCertificatePdf } from "./certificate-generation.service";
import { getSignedCertificateDownloadUrl, storeCertificate } from "./certificate-storage.service";
import {
  defaultCertificateRequirements,
  evaluateCertificateEligibility as evaluateEligibilityRules,
  type CertificateProgressSnapshot,
  type CertificateRequirementConfig,
} from "./certificate-eligibility.service";

export type CertificateRecord = {
  id: string;
  company_id: string;
  employee_id: string;
  campaign_id: string | null;
  certificate_number: string;
  issued_at: string | null;
  expires_at: string | null;
  status: "eligible" | "generating" | "issued" | "expired" | "revoked" | "failed";
  verification_code: string;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignRequirementRow = {
  id: string;
  company_id: string;
  name: string;
  required_lesson_completion: boolean | null;
  required_quiz_completion: boolean | null;
  required_scenario_completion: boolean | null;
  requires_final_assessment: boolean | null;
  minimum_quiz_score: number | null;
  minimum_final_assessment_score: number | null;
  certificate_expiry_days: number | null;
};

type MissionRow = {
  id: string;
  type: string;
  status: string;
};

type MissionProgressRow = {
  mission_id: string;
  score: number | null;
  status: string;
};

async function logAudit(companyId: string, userId: string | null, action: string, entityId: string, metadata: Record<string, unknown>) {
  await supabaseAdmin.from("audit_logs").insert({
    company_id: companyId,
    user_id: userId,
    action,
    entity_type: "certificate",
    entity_id: entityId,
    metadata,
  });
}

function resolveRequirementConfig(campaign: CampaignRequirementRow): CertificateRequirementConfig {
  return {
    requiredLessonCompletion: campaign.required_lesson_completion ?? defaultCertificateRequirements.requiredLessonCompletion,
    requiredQuizCompletion: campaign.required_quiz_completion ?? defaultCertificateRequirements.requiredQuizCompletion,
    requiredScenarioCompletion: campaign.required_scenario_completion ?? defaultCertificateRequirements.requiredScenarioCompletion,
    requiresFinalAssessment: campaign.requires_final_assessment ?? defaultCertificateRequirements.requiresFinalAssessment,
    minimumQuizScore: Number(campaign.minimum_quiz_score ?? defaultCertificateRequirements.minimumQuizScore),
    minimumFinalAssessmentScore: Number(campaign.minimum_final_assessment_score ?? defaultCertificateRequirements.minimumFinalAssessmentScore),
    certificateExpiryDays: campaign.certificate_expiry_days ?? defaultCertificateRequirements.certificateExpiryDays,
  };
}

async function getCampaignProgressSnapshot(campaignId: string, employeeId: string): Promise<CertificateProgressSnapshot> {
  const { data: participant } = await supabaseAdmin
    .from("campaign_participants")
    .select("status, completion_percentage")
    .eq("campaign_id", campaignId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  const { data: missions } = await supabaseAdmin
    .from("daily_missions")
    .select("id, type, status")
    .eq("campaign_id", campaignId)
    .eq("employee_id", employeeId);

  const missionRows = (missions ?? []) as MissionRow[];
  const missionIds = missionRows.map((mission) => mission.id);
  const { data: progressRows } = await supabaseAdmin
    .from("mission_progress")
    .select("mission_id, score, status")
    .eq("employee_id", employeeId)
    .in("mission_id", missionIds.length ? missionIds : ["00000000-0000-0000-0000-000000000000"]);

  const progressList = (progressRows ?? []) as MissionProgressRow[];
  const progressMap = new Map(progressList.map((row) => [row.mission_id, row]));
  const lessonMissions = missionRows.filter((mission) => mission.type === "lesson");
  const quizMissions = missionRows.filter((mission) => mission.type === "quiz");
  const scenarioMissions = missionRows.filter((mission) => mission.type === "scenario");
  const finalAssessmentMissions = missionRows.filter((mission) => mission.type === "finalAssessment");

  const requiredLessonsCompleted = lessonMissions.every((mission) => mission.status === "completed");
  const requiredScenariosCompleted = scenarioMissions.every((mission) => mission.status === "completed");

  const quizScores = quizMissions
    .map((mission) => progressMap.get(mission.id)?.score)
    .filter((score): score is number => typeof score === "number");
  const finalScores = finalAssessmentMissions
    .map((mission) => progressMap.get(mission.id)?.score)
    .filter((score): score is number => typeof score === "number");

  const quizScore = quizScores.length ? Math.round(quizScores.reduce((sum: number, score: number) => sum + score, 0) / quizScores.length) : null;
  const finalAssessmentScore = finalScores.length ? Math.round(finalScores.reduce((sum: number, score: number) => sum + score, 0) / finalScores.length) : null;

  return {
    participantStatus: participant?.status === "completed" ? "COMPLETED" : participant?.status === "overdue" ? "OVERDUE" : participant?.status === "active" ? "IN_PROGRESS" : "NOT_STARTED",
    requiredLessonsCompleted,
    requiredQuizzesPassed: quizMissions.every((mission) => mission.status === "completed"),
    requiredScenariosCompleted,
    finalAssessmentPassed: finalAssessmentMissions.length === 0 || finalAssessmentMissions.every((mission) => mission.status === "completed"),
    quizScore,
    finalAssessmentScore,
  };
}

export async function evaluateCampaignCertificateEligibility(campaignId: string, employeeId: string) {
  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, company_id, name, required_lesson_completion, required_quiz_completion, required_scenario_completion, requires_final_assessment, minimum_quiz_score, minimum_final_assessment_score, certificate_expiry_days")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    throw new Error("Campaign not found for eligibility.");
  }

  const config = resolveRequirementConfig(campaign as CampaignRequirementRow);
  const snapshot = await getCampaignProgressSnapshot(campaignId, employeeId);
  const evaluation = evaluateEligibilityRules(config, snapshot);

  if (evaluation.eligible) {
    dispatchNotificationEvent({
      id: `evt-certificate-eligible-${campaignId}-${employeeId}`,
      companyId: campaign.company_id,
      createdAt: new Date().toISOString(),
      eventType: "CertificateEligible",
      payload: {
        companyId: campaign.company_id,
        campaignId,
        userId: employeeId,
        title: "Certificate eligible",
        body: `${campaign.name} is now eligible for certificate generation.`,
      },
    });
  }

  return {
    campaign,
    config,
    snapshot,
    evaluation,
  };
}

export async function issueCertificate(campaignId: string, employeeId: string) {
  const eligibility = await evaluateCampaignCertificateEligibility(campaignId, employeeId);

  if (!eligibility.evaluation.eligible) {
    return {
      issued: false,
      reasons: eligibility.evaluation.reasons,
      certificate: null,
    };
  }

  const existing = await supabaseAdmin
    .from("certificates")
    .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at")
    .eq("company_id", eligibility.campaign.company_id)
    .eq("employee_id", employeeId)
    .eq("campaign_id", campaignId)
    .in("status", ["issued", "eligible", "generating"])
    .maybeSingle();

  if (existing.data) {
    return {
      issued: true,
      reasons: [],
      certificate: existing.data as CertificateRecord,
    };
  }

  const now = new Date();
  const issuedAt = now.toISOString();
  const expiryDays = eligibility.config.certificateExpiryDays;
  const expiresAt = typeof expiryDays === "number" && expiryDays > 0
    ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const draftRecord = buildCertificateRecord({
    companyId: eligibility.campaign.company_id,
    employeeId,
    campaignId,
    issuedAt,
    expiresAt,
  });

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("certificates")
    .insert(draftRecord)
    .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Failed to create certificate draft.");
  }

  await logAudit(eligibility.campaign.company_id, employeeId, "Certificate Generation Started", inserted.id, {
    campaignId,
    employeeId,
  });

  try {
    const { data: employee } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", employeeId)
      .single();
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", eligibility.campaign.company_id)
      .single();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const verificationUrl = `${siteUrl.replace(/\/$/, "")}/verify/${inserted.verification_code}`;

    const pdfBytes = await generateCertificatePdf({
      employeeName: `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim() || "Employee",
      campaignName: eligibility.campaign.name,
      companyName: company?.name ?? "SafetyXP",
      certificateNumber: inserted.certificate_number,
      verificationCode: inserted.verification_code,
      issuedAt: inserted.issued_at ?? issuedAt,
      expiresAt: inserted.expires_at,
      verificationUrl,
    });

    const storage = await storeCertificate(inserted.id, inserted.company_id, pdfBytes);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("certificates")
      .update({
        status: "issued",
        storage_path: storage.storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inserted.id)
      .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || "Failed to finalize certificate.");
    }

    await logAudit(inserted.company_id, employeeId, "Certificate Generated", inserted.id, {
      campaignId,
      employeeId,
      status: "issued",
    });

    return {
      issued: true,
      reasons: [],
      certificate: updated as CertificateRecord,
    };
  } catch (error) {
    await supabaseAdmin
      .from("certificates")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", inserted.id);

    await logAudit(inserted.company_id, employeeId, "Certificate Generation Failed", inserted.id, {
      campaignId,
      employeeId,
      error: error instanceof Error ? error.message : "Unknown",
    });

    throw error;
  }
}

export async function getEmployeeCertificates() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [] as CertificateRecord[];
  }

  const { data } = await supabase
    .from("certificates")
    .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at, campaigns(name)")
    .eq("employee_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as CertificateRecord[];
}

export async function hasIssuedEmployeeCertificate() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Could not verify the authenticated user for certificate lookup.");
  }

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("id")
    .eq("employee_id", user.id)
    .eq("status", "issued")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Could not check employee certificate availability.");
  }

  return Boolean(data);
}

export async function getCompanyCertificates() {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return [] as CertificateRecord[];
  }

  const { data } = await supabase
    .from("certificates")
    .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at, profiles(first_name,last_name,department_id), campaigns(name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as CertificateRecord[];
}

export async function getCertificate(certificateId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at")
    .eq("id", certificateId)
    .maybeSingle();

  return (data ?? null) as CertificateRecord | null;
}

export async function revokeCertificate(certificateId: string, reason: string) {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    throw new Error("Unauthorized");
  }

  const { data: certificate } = await supabase
    .from("certificates")
    .select("id, company_id")
    .eq("id", certificateId)
    .eq("company_id", profile.company_id)
    .single();

  if (!certificate) {
    throw new Error("Certificate not found.");
  }

  const { data, error } = await supabase
    .from("certificates")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", certificate.id)
    .select("id, company_id, employee_id, campaign_id, certificate_number, issued_at, expires_at, status, verification_code, storage_path, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logAudit(profile.company_id, profile.id, "Certificate Revoked", certificateId, { reason });
  return data as CertificateRecord;
}

export async function reissueCertificate(certificateId: string, reason: string) {
  const existing = await getCertificate(certificateId);
  if (!existing || !existing.campaign_id) {
    throw new Error("Certificate not found.");
  }

  await revokeCertificate(certificateId, `Reissued: ${reason}`);
  const result = await issueCertificate(existing.campaign_id, existing.employee_id);

  if (result.certificate) {
    await logAudit(existing.company_id, existing.employee_id, "Certificate Reissued", result.certificate.id, {
      sourceCertificateId: certificateId,
      reason,
    });
  }

  return result.certificate;
}

export async function getCertificateDownloadUrl(certificateId: string) {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Unauthorized");
  }

  const { data: cert, error } = await supabase
    .from("certificates")
    .select("id, company_id, employee_id, storage_path")
    .eq("id", certificateId)
    .maybeSingle();

  if (error || !cert || !cert.storage_path) {
    throw new Error("Certificate not found.");
  }

  const isOwner = cert.employee_id === profile.id;
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
  const isSameCompany = cert.company_id === profile.company_id;

  if (!isOwner && !(isAdmin && isSameCompany)) {
    throw new Error("Unauthorized");
  }

  await logAudit(cert.company_id, profile.id, "Certificate Downloaded", cert.id, {
    actorRole: profile.role,
  });

  return getSignedCertificateDownloadUrl(cert.storage_path, 120);
}
