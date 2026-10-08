import { getCompany } from "@/services/company.service";
import { getCompanyAdminSupabase } from "@/services/admin/employee-management.service";

export type CompanyAdminDashboardData = {
  company: {
    id: string;
    name: string;
  };
  admin: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  metrics: {
    employeeCount: number;
    activeCampaignCount: number;
    issuedCertificateCount: number;
  };
};

export async function getCompanyAdminDashboardData(): Promise<CompanyAdminDashboardData> {
  const { supabase, profile } = await getCompanyAdminSupabase();
  const companyId = profile.company_id;

  const [company, employeesResult, campaignsResult, certificatesResult] = await Promise.all([
    getCompany(companyId),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role", "employee"),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "issued"),
  ]);

  if (!company || company.id !== companyId) {
    throw new Error("Could not load the authenticated company.");
  }

  if (employeesResult.error) {
    throw new Error("Could not load the company employee count.");
  }

  if (campaignsResult.error) {
    throw new Error("Could not load the active campaign count.");
  }

  if (certificatesResult.error) {
    throw new Error("Could not load the issued certificate count.");
  }

  if (
    employeesResult.count === null ||
    campaignsResult.count === null ||
    certificatesResult.count === null
  ) {
    throw new Error("Dashboard metric counts were not returned by the database.");
  }

  return {
    company: { id: company.id, name: company.name },
    admin: {
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
    },
    metrics: {
      employeeCount: employeesResult.count,
      activeCampaignCount: campaignsResult.count,
      issuedCertificateCount: certificatesResult.count,
    },
  };
}
