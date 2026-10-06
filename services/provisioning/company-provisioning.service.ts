import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "@/services/email/email.service";

export type CompanyProvisioningInput = {
  companyName: string;
  industry: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  timezone?: string;
  logoUrl?: string;
};

export type CompanyProvisioningSummary = {
  company: {
    id: string;
    name: string;
    industry: string | null;
    logoUrl: string | null;
    timezone: string;
    created: boolean;
  };
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "admin";
    created: boolean;
    inviteSent: boolean;
  };
  invitation: {
    linkCreated: boolean;
    emailSent: boolean;
  };
  recovery: {
    partial: boolean;
    notes: string[];
  };
};

type ProvisioningAuditAction =
  | "Company Created"
  | "Initial Admin Provisioned"
  | "Admin Invitation Created"
  | "Admin Invitation Accepted"
  | "Admin Password Created"
  | "Provisioning Failed"
  | "Provisioning Recovery";

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "employee" | "admin" | "super_admin";
  job_title: string | null;
  department_id: string | null;
  employee_number: string | null;
  avatar_url: string | null;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveAppUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function resolveSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function resolveServiceRoleKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function assertProvisioningEnvironment() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceRoleKey = resolveServiceRoleKey();

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl, serviceRoleKey };
}

async function audit(companyId: string, actorUserId: string | null, action: ProvisioningAuditAction, entityId: string, metadata: Record<string, unknown>) {
  await supabaseAdmin.from("audit_logs").insert({
    company_id: companyId,
    user_id: actorUserId,
    action,
    entity_type: "company_provisioning",
    entity_id: entityId,
    metadata,
  });
}

async function findAuthUserByEmail(email: string) {
  const pageSize = 100;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: pageSize });

    if (error) {
      throw new Error(`Failed to look up existing user: ${error.message}`);
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return user as AuthUserRow;
    }

    if ((data.users?.length ?? 0) < pageSize) {
      break;
    }
  }

  return null;
}

async function findCompanyByName(companyName: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, industry, logo_url, timezone, created_at, updated_at")
    .ilike("name", companyName)
    .maybeSingle<CompanyRow>();

  if (error) {
    throw new Error(`Failed to look up company: ${error.message}`);
  }

  return data ?? null;
}

async function findProfileByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id, email, first_name, last_name, role, job_title, department_id, employee_number, avatar_url")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(`Failed to look up profile: ${error.message}`);
  }

  return data ?? null;
}

async function createCompanyRecord(input: CompanyProvisioningInput) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name: input.companyName,
      industry: input.industry,
      logo_url: input.logoUrl ?? null,
      timezone: input.timezone ?? "UTC",
    })
    .select("id, name, industry, logo_url, timezone, created_at, updated_at")
    .single<CompanyRow>();

  if (error || !data) {
    throw new Error(`Failed to create company: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

async function deleteCompanyIfOrphaned(companyId: string) {
  const [{ count: profileCount }, { count: policyCount }, { count: campaignCount }, { count: certificateCount }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabaseAdmin.from("policies").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabaseAdmin.from("certificates").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  if ((profileCount ?? 0) > 0 || (policyCount ?? 0) > 0 || (campaignCount ?? 0) > 0 || (certificateCount ?? 0) > 0) {
    return false;
  }

  await supabaseAdmin.from("companies").delete().eq("id", companyId);
  return true;
}

async function ensureInvitationLink(email: string, nextPath = "/reset-password") {
  const redirectTo = `${resolveAppUrl()}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
  const authAdmin = supabaseAdmin.auth.admin as unknown as {
    generateLink: (args: {
      type: "invite" | "recovery";
      email: string;
      options?: { redirectTo?: string; data?: Record<string, unknown> };
    }) => Promise<{ data?: { properties?: { action_link?: string } } & Record<string, unknown>; error?: { message: string } }>
  };

  const inviteResult = await authAdmin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
    },
  });

  if (inviteResult.error) {
    const recoveryResult = await authAdmin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (recoveryResult.error) {
      throw new Error(`Unable to create password setup link: ${inviteResult.error.message}; ${recoveryResult.error.message}`);
    }

    const recoveryLink = recoveryResult.data?.properties?.action_link;
    if (!recoveryLink) {
      throw new Error("Recovery link generation did not return a usable action link.");
    }

    return { actionLink: recoveryLink, kind: "recovery" as const };
  }

  const inviteLink = inviteResult.data?.properties?.action_link;
  if (!inviteLink) {
    throw new Error("Invite link generation did not return a usable action link.");
  }

  return { actionLink: inviteLink, kind: "invite" as const };
}

async function upsertAdminProfile(input: {
  userId: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await findProfileByUserId(input.userId);

  if (existing && existing.company_id !== input.companyId) {
    throw new Error(`Existing user profile belongs to another company (${existing.company_id}).`);
  }

  if (existing && existing.role !== "admin") {
    throw new Error(`Existing user profile has role ${existing.role}; refusing to overwrite.`);
  }

  const payload = {
    id: input.userId,
    company_id: input.companyId,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    role: "admin" as const,
    job_title: "Company Admin",
    department_id: null,
    employee_number: null,
    avatar_url: null,
  };

  const { error } = await supabaseAdmin.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to upsert admin profile: ${error.message}`);
  }

  return payload;
}

export function validateProvisioningInput(input: CompanyProvisioningInput) {
  const companyName = normalizeText(input.companyName);
  const industry = normalizeText(input.industry);
  const adminFirstName = normalizeText(input.adminFirstName);
  const adminLastName = normalizeText(input.adminLastName);
  const adminEmail = normalizeText(input.adminEmail).toLowerCase();
  const timezone = normalizeText(input.timezone ?? "UTC") || "UTC";
  const logoUrl = normalizeText(input.logoUrl ?? "");

  const errors: string[] = [];

  if (!companyName) {
    errors.push("Company name is required.");
  }

  if (!industry) {
    errors.push("Industry is required.");
  }

  if (!adminFirstName) {
    errors.push("Admin first name is required.");
  }

  if (!adminLastName) {
    errors.push("Admin last name is required.");
  }

  if (!isValidEmail(adminEmail)) {
    errors.push("A valid admin email address is required.");
  }

  if (!isValidTimeZone(timezone)) {
    errors.push(`Timezone '${timezone}' is not valid.`);
  }

  if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
    errors.push("Company logo URL must use http or https.");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      companyName,
      industry,
      adminFirstName,
      adminLastName,
      adminEmail,
      timezone,
      logoUrl: logoUrl || undefined,
    },
  };
}

export function buildAdminInvitationEmail(input: {
  companyName: string;
  adminFirstName: string;
  adminEmail: string;
  actionLink: string;
}) {
  return {
    heading: "You've been invited to manage SafetyXP",
    greeting: `Hello ${input.adminFirstName},`,
    message: `You've been invited to manage SafetyXP for ${input.companyName}. Create your password to access your company workspace.`,
    ctaLabel: "Set Up Your Account",
    ctaUrl: input.actionLink,
    companyName: "SafetyXP",
    footer: `Invitation for ${input.adminEmail}`,
  };
}

export async function sendAdminInvitationEmail(input: {
  companyName: string;
  adminFirstName: string;
  adminEmail: string;
  actionLink: string;
}) {
  const emailTemplate = buildAdminInvitationEmail(input);
  const sendResult = await sendTemplatedEmail({
    to: input.adminEmail,
    ...emailTemplate,
  });

  if (!sendResult.success) {
    throw new Error(sendResult.reason || "Failed to send admin invitation email.");
  }

  return { provider: sendResult.provider };
}

export async function provisionCompanyWithAdmin(input: CompanyProvisioningInput): Promise<CompanyProvisioningSummary> {
  assertProvisioningEnvironment();

  const normalized = validateProvisioningInput(input);
  if (!normalized.ok) {
    throw new Error(normalized.errors.join(" "));
  }

  const existingCompany = await findCompanyByName(normalized.value.companyName);
  const company = existingCompany ?? (await createCompanyRecord(normalized.value));
  const companyCreated = !existingCompany;

  if (companyCreated) {
    await audit(company.id, null, "Company Created", company.id, {
      companyName: company.name,
      industry: company.industry,
      timezone: company.timezone,
    });
  }

  const existingAuthUser = await findAuthUserByEmail(normalized.value.adminEmail);
  const existingProfile = existingAuthUser ? await findProfileByUserId(existingAuthUser.id) : null;

  if (existingProfile && existingProfile.company_id !== company.id) {
    throw new Error(`Admin email already belongs to company ${existingProfile.company_id}.`);
  }

  let adminUser: AuthUserRow | null = existingAuthUser;

  if (!adminUser) {
    const userResult = await (supabaseAdmin.auth.admin as unknown as {
      createUser: (attributes: Record<string, unknown>) => Promise<{ data?: { user?: AuthUserRow }; error?: { message: string } }>
    }).createUser({
      email: normalized.value.adminEmail,
      email_confirm: false,
      user_metadata: {
        first_name: normalized.value.adminFirstName,
        last_name: normalized.value.adminLastName,
        company_id: company.id,
        role: "admin",
      },
    });

    if (userResult.error || !userResult.data?.user) {
      throw new Error(`Failed to create admin auth user: ${userResult.error?.message ?? "unknown error"}`);
    }

    adminUser = userResult.data.user as AuthUserRow;
  }

  let profileCreated = false;
  let inviteLink: string | null = null;

  try {
    const profile = await upsertAdminProfile({
      userId: adminUser.id,
      companyId: company.id,
      email: normalized.value.adminEmail,
      firstName: normalized.value.adminFirstName,
      lastName: normalized.value.adminLastName,
    });

    profileCreated = true;

    await audit(company.id, adminUser.id, "Initial Admin Provisioned", profile.id, {
      adminEmail: normalized.value.adminEmail,
      role: "admin",
    });

    const invitation = await ensureInvitationLink(normalized.value.adminEmail, "/reset-password");
    inviteLink = invitation.actionLink;

    await audit(company.id, adminUser.id, "Admin Invitation Created", profile.id, {
      invitationKind: invitation.kind,
      adminEmail: normalized.value.adminEmail,
    });

    const sendResult = await sendAdminInvitationEmail({
      companyName: company.name,
      adminFirstName: normalized.value.adminFirstName,
      adminEmail: normalized.value.adminEmail,
      actionLink: inviteLink,
    });

    await audit(company.id, adminUser.id, "Admin Password Created", profile.id, {
      invitationKind: invitation.kind,
      emailProvider: sendResult.provider,
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        logoUrl: company.logo_url,
        timezone: company.timezone,
        created: companyCreated,
      },
      admin: {
        id: adminUser.id,
        email: normalized.value.adminEmail,
        firstName: normalized.value.adminFirstName,
        lastName: normalized.value.adminLastName,
        role: "admin",
        created: !existingAuthUser,
        inviteSent: true,
      },
      invitation: {
        linkCreated: Boolean(inviteLink),
        emailSent: true,
      },
      recovery: {
        partial: false,
        notes: companyCreated ? ["Company created."] : ["Existing company reused."],
      },
    };
  } catch (error) {
    await audit(company.id, adminUser?.id ?? null, "Provisioning Failed", company.id, {
      companyCreated,
      profileCreated,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (!existingAuthUser && adminUser?.id) {
      await supabaseAdmin.auth.admin.deleteUser(adminUser.id);
    }

    if (companyCreated) {
      const orphanRemoved = await deleteCompanyIfOrphaned(company.id);
      if (orphanRemoved) {
        await audit(company.id, null, "Provisioning Recovery", company.id, {
          action: "Removed orphaned company after failed provisioning.",
        });
      }
    }

    throw error;
  }
}
