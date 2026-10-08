import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getCompany } from "@/services/company.service";
import { getCompanyAdminSupabase } from "@/services/admin/employee-management.service";
import { getCompanyAdminDashboardData } from "./dashboard.service";

jest.mock("@/services/admin/employee-management.service", () => ({
  getCompanyAdminSupabase: jest.fn(),
}));

jest.mock("@/services/company.service", () => ({
  getCompany: jest.fn(),
}));

type Row = Record<string, unknown>;
type QueryResult = {
  data: Row[];
  error: { message: string } | null;
  count: number | null;
};

const authenticatedAdmin = {
  id: "admin-a",
  company_id: "company-a",
  role: "admin",
  first_name: "Hloni",
  last_name: "Test Admin",
  avatar_url: "https://example.test/avatar.png",
};

const rowsByTable: Record<string, Row[]> = {
  profiles: [
    { id: "admin-a", company_id: "company-a", role: "admin" },
    { id: "employee-a", company_id: "company-a", role: "employee" },
    { id: "employee-b", company_id: "company-a", role: "employee" },
    { id: "employee-c", company_id: "company-a", role: "employee" },
    { id: "employee-other", company_id: "company-b", role: "employee" },
  ],
  campaigns: [
    { id: "campaign-draft", company_id: "company-a", status: "draft" },
    { id: "campaign-other", company_id: "company-b", status: "active" },
  ],
  certificates: [
    { id: "certificate-eligible", company_id: "company-a", status: "eligible" },
    { id: "certificate-other", company_id: "company-b", status: "issued" },
  ],
};

let errorsByTable: Record<string, { message: string }>;
let queryLog: Array<{ table: string; filters: Array<[string, unknown]> }>;

class QueryBuilder implements PromiseLike<QueryResult> {
  private filters: Array<[string, unknown]> = [];

  constructor(private readonly table: string) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  private result(): QueryResult {
    queryLog.push({ table: this.table, filters: [...this.filters] });
    const matchingRows = (rowsByTable[this.table] ?? []).filter((row) =>
      this.filters.every(([column, value]) => row[column] === value)
    );

    return {
      data: matchingRows,
      error: errorsByTable[this.table] ?? null,
      count: matchingRows.length,
    };
  }

  async maybeSingle() {
    const result = this.result();
    return { data: result.data[0] ?? null, error: result.error };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }
}

function installSupabaseMock() {
  const mockClient = {
    from: jest.fn((table: string) => new QueryBuilder(table)),
  };
  return mockClient;
}

describe("Company Admin dashboard data", () => {
  beforeEach(() => {
    errorsByTable = {};
    queryLog = [];

    const supabase = installSupabaseMock();
    jest.mocked(getCompanyAdminSupabase).mockResolvedValue(
      { supabase, profile: authenticatedAdmin } as unknown as Awaited<
        ReturnType<typeof getCompanyAdminSupabase>
      >
    );
    jest.mocked(getCompany).mockResolvedValue({
      id: "company-a",
      name: "SafetyXP Test Company",
      industry: null,
      logo_url: null,
      created_at: "",
      updated_at: "",
    });
  });

  it("returns the authenticated admin identity and their company metrics", async () => {
    await expect(getCompanyAdminDashboardData()).resolves.toMatchObject({
      company: { id: "company-a", name: "SafetyXP Test Company" },
      admin: {
        id: "admin-a",
        firstName: "Hloni",
        lastName: "Test Admin",
        avatarUrl: "https://example.test/avatar.png",
      },
      metrics: {
        employeeCount: 3,
        activeCampaignCount: 0,
        issuedCertificateCount: 0,
      },
    });
    expect(getCompany).toHaveBeenCalledWith("company-a");
  });

  it("scopes all counts to the authenticated company and required roles/statuses", async () => {
    await getCompanyAdminDashboardData();

    expect(queryLog).toEqual(expect.arrayContaining([
      {
        table: "profiles",
        filters: [["company_id", "company-a"], ["role", "employee"]],
      },
      {
        table: "campaigns",
        filters: [["company_id", "company-a"], ["status", "active"]],
      },
      {
        table: "certificates",
        filters: [["company_id", "company-a"], ["status", "issued"]],
      },
    ]));
  });

  it("does not count eligible certificates or include another company's records", async () => {
    const dashboard = await getCompanyAdminDashboardData();

    expect(dashboard.metrics).toEqual({
      employeeCount: 3,
      activeCampaignCount: 0,
      issuedCertificateCount: 0,
    });
  });

  it("surfaces count query failures instead of returning zero metrics", async () => {
    errorsByTable.campaigns = { message: "database unavailable" };

    await expect(getCompanyAdminDashboardData()).rejects.toThrow(
      "Could not load the active campaign count."
    );
  });
});
