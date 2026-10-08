import "server-only";
import { isAdminRole } from "@/lib/auth-utils";
import { EmployeeAccessError, getCompanyAdminSupabase } from "@/services/admin/employee-management.service";
import type { DatabaseSchema } from "@/types/database";

type CampaignRow = DatabaseSchema["campaigns"];
type LearningModuleRow = DatabaseSchema["learning_modules"];

export type CreateCampaignInput = {
  name: string;
  description?: string;
  officialDeadline: string;
  bufferDays?: number;
};

export type CreateLearningModuleInput = {
  title: string;
  description?: string | null;
  content?: string | null;
  estimatedMinutes?: number | null;
  orderIndex?: number;
};

export type CampaignRecord = Pick<
  CampaignRow,
  | "id"
  | "company_id"
  | "name"
  | "description"
  | "official_deadline"
  | "learning_deadline"
  | "buffer_days"
  | "status"
  | "created_by"
  | "published_at"
  | "created_at"
  | "updated_at"
>;

export type LearningModuleRecord = Pick<
  LearningModuleRow,
  | "id"
  | "campaign_id"
  | "title"
  | "description"
  | "content"
  | "estimated_minutes"
  | "order_index"
  | "status"
  | "created_at"
>;

export class CampaignManagementError extends Error {
  constructor(
    readonly code: "invalid" | "not_found" | "database",
    message: string
  ) {
    super(message);
    this.name = "CampaignManagementError";
  }
}

const campaignColumns =
  "id, company_id, name, description, official_deadline, learning_deadline, buffer_days, status, created_by, published_at, created_at, updated_at";
const learningModuleColumns =
  "id, campaign_id, title, description, content, estimated_minutes, order_index, status, created_at";

function parseDeadline(value: string) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  let timestamp: number;

  if (dateOnlyMatch) {
    const [, yearText, monthText, dayText] = dateOnlyMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }
  } else {
    if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
      return null;
    }
    timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return null;
    }
    const datePrefix = value.slice(0, 10);
    const [year, month, day] = datePrefix.split("-").map(Number);
    const parsedPrefix = new Date(Date.UTC(year, month - 1, day));
    if (
      parsedPrefix.getUTCFullYear() !== year ||
      parsedPrefix.getUTCMonth() !== month - 1 ||
      parsedPrefix.getUTCDate() !== day
    ) {
      return null;
    }
  }

  return new Date(timestamp);
}

function requireCompanyAdmin(profile: { id: string; company_id: string | null; role: string }) {
  if (!profile.company_id || !isAdminRole(profile.role)) {
    throw new EmployeeAccessError("forbidden");
  }
  return { id: profile.id, companyId: profile.company_id };
}

async function getCampaignForCompany(
  supabase: Awaited<ReturnType<typeof getCompanyAdminSupabase>>["supabase"],
  companyId: string,
  campaignId: string
): Promise<CampaignRecord> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(campaignColumns)
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle<CampaignRecord>();

  if (error) {
    throw new CampaignManagementError("database", "Could not load the campaign.");
  }
  if (!data) {
    throw new CampaignManagementError("not_found", "Campaign not found.");
  }
  return data;
}

function validateCampaignInput(input: CreateCampaignInput) {
  if (typeof input.name !== "string" || !input.name.trim()) {
    throw new CampaignManagementError("invalid", "Campaign name is required.");
  }
  if (input.description !== undefined && typeof input.description !== "string") {
    throw new CampaignManagementError("invalid", "Campaign description is invalid.");
  }

  const officialDeadline = parseDeadline(input.officialDeadline);
  if (!officialDeadline) {
    throw new CampaignManagementError("invalid", "A valid official deadline is required.");
  }

  const bufferDays = input.bufferDays ?? 2;
  if (!Number.isSafeInteger(bufferDays) || bufferDays < 0 || bufferDays > 2_147_483_647) {
    throw new CampaignManagementError("invalid", "Buffer days must be a non-negative whole number.");
  }

  const learningDeadline = new Date(officialDeadline.getTime() - bufferDays * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(learningDeadline.getTime())) {
    throw new CampaignManagementError("invalid", "The learning deadline is outside the supported date range.");
  }

  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    officialDeadline: officialDeadline.toISOString(),
    learningDeadline: learningDeadline.toISOString(),
    bufferDays,
  };
}

function validateLearningModules(modules: CreateLearningModuleInput[]) {
  if (!Array.isArray(modules)) {
    throw new CampaignManagementError("invalid", "Learning modules must be provided as a list.");
  }

  return modules.map((module, index) => {
    if (!module || typeof module.title !== "string" || !module.title.trim()) {
      throw new CampaignManagementError("invalid", `Learning module ${index + 1} requires a title.`);
    }
    if (
      module.description !== undefined &&
      module.description !== null &&
      typeof module.description !== "string"
    ) {
      throw new CampaignManagementError("invalid", `Learning module ${index + 1} has an invalid description.`);
    }
    if (
      module.content !== undefined &&
      module.content !== null &&
      typeof module.content !== "string"
    ) {
      throw new CampaignManagementError("invalid", `Learning module ${index + 1} has invalid content.`);
    }
    if (
      module.estimatedMinutes !== undefined &&
      module.estimatedMinutes !== null &&
      (!Number.isSafeInteger(module.estimatedMinutes) || module.estimatedMinutes < 0)
    ) {
      throw new CampaignManagementError("invalid", `Learning module ${index + 1} has an invalid duration.`);
    }
    const orderIndex = module.orderIndex ?? index;
    if (!Number.isSafeInteger(orderIndex) || orderIndex < 0 || orderIndex > 2_147_483_647) {
      throw new CampaignManagementError("invalid", `Learning module ${index + 1} has an invalid order.`);
    }

    return {
      title: module.title.trim(),
      description: module.description?.trim() || null,
      content: module.content ?? null,
      estimated_minutes: module.estimatedMinutes ?? null,
      order_index: orderIndex,
      status: "draft" as const,
    };
  });
}

export async function createCompanyCampaign(input: CreateCampaignInput): Promise<CampaignRecord> {
  const campaign = validateCampaignInput(input);
  const { supabase, profile } = await getCompanyAdminSupabase();
  const admin = requireCompanyAdmin(profile);

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      company_id: admin.companyId,
      name: campaign.name,
      description: campaign.description,
      official_deadline: campaign.officialDeadline,
      learning_deadline: campaign.learningDeadline,
      buffer_days: campaign.bufferDays,
      status: "draft",
      created_by: admin.id,
    })
    .select(campaignColumns)
    .single<CampaignRecord>();

  if (error || !data) {
    throw new CampaignManagementError("database", "Could not create the campaign.");
  }
  return data;
}

export async function getCompanyCampaigns(): Promise<CampaignRecord[]> {
  const { supabase, profile } = await getCompanyAdminSupabase();
  const admin = requireCompanyAdmin(profile);
  const { data, error } = await supabase
    .from("campaigns")
    .select(campaignColumns)
    .eq("company_id", admin.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new CampaignManagementError("database", "Could not load company campaigns.");
  }
  return data ?? [];
}

export async function getCompanyCampaignById(campaignId: string): Promise<CampaignRecord> {
  const { supabase, profile } = await getCompanyAdminSupabase();
  const admin = requireCompanyAdmin(profile);
  return getCampaignForCompany(supabase, admin.companyId, campaignId);
}

export async function createLearningModules(
  campaignId: string,
  modules: CreateLearningModuleInput[]
): Promise<LearningModuleRecord[]> {
  const rows = validateLearningModules(modules);
  const { supabase, profile } = await getCompanyAdminSupabase();
  const admin = requireCompanyAdmin(profile);
  await getCampaignForCompany(supabase, admin.companyId, campaignId);

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("learning_modules")
    .insert(rows.map((row) => ({ ...row, campaign_id: campaignId })))
    .select(learningModuleColumns);

  if (error || !data) {
    throw new CampaignManagementError("database", "Could not create learning modules.");
  }
  return data;
}

export async function getCampaignLearningModules(campaignId: string): Promise<LearningModuleRecord[]> {
  const { supabase, profile } = await getCompanyAdminSupabase();
  const admin = requireCompanyAdmin(profile);
  await getCampaignForCompany(supabase, admin.companyId, campaignId);

  const { data, error } = await supabase
    .from("learning_modules")
    .select(learningModuleColumns)
    .eq("campaign_id", campaignId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new CampaignManagementError("database", "Could not load campaign learning modules.");
  }
  return data ?? [];
}
