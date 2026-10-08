import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as employeeManagement from "@/services/admin/employee-management.service";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import type {
  CreateCampaignInput,
  CreateLearningModuleInput,
} from "./campaign-management.service";
import {
  CampaignManagementError,
  createCompanyCampaign,
  createLearningModules,
  getCampaignLearningModules,
  getCompanyCampaignById,
  getCompanyCampaigns,
} from "./campaign-management.service";

type Row = Record<string, unknown>;
type QueryError = { message: string };
type QueryResult = { data: unknown; error: QueryError | null };
type Operation = "select" | "insert";

const adminProfile = { id: "admin-a", company_id: "company-a", role: "admin" };
const campaignA = {
  id: "campaign-a",
  company_id: "company-a",
  name: "Safety induction",
  description: null,
  official_deadline: "2026-12-31T00:00:00.000Z",
  learning_deadline: "2026-12-29T00:00:00.000Z",
  buffer_days: 2,
  status: "draft",
  created_by: "admin-a",
  published_at: null,
  created_at: "2026-10-08T00:00:00.000Z",
  updated_at: "2026-10-08T00:00:00.000Z",
};

let campaigns: Row[];
let modules: Row[];
let insertedRows: Array<{ table: string; values: Row[] }>;
let queryLog: Array<{ table: string; operation: Operation; filters: Array<[string, unknown]> }>;
let errorsByTable: Record<string, QueryError>;
let profile: typeof adminProfile;

class QueryBuilder implements PromiseLike<QueryResult> {
  private operation: Operation = "select";
  private filters: Array<[string, unknown]> = [];
  private values: Row[] = [];
  private insertedMany = false;
  private readonly table: string;

  constructor(table: string) {
    this.table = table;
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = "insert";
    this.insertedMany = Array.isArray(values);
    this.values = Array.isArray(values) ? values : [values];
    return this;
  }

  private result(): QueryResult {
    queryLog.push({
      table: this.table,
      operation: this.operation,
      filters: [...this.filters],
    });
    const error = errorsByTable[this.table] ?? null;
    if (error) {
      return { data: null, error };
    }

    if (this.operation === "insert") {
      insertedRows.push({ table: this.table, values: this.values });
      const inserted = this.values.map((value, index) => ({
        id: `${this.table}-inserted-${index + 1}`,
        ...(this.table === "campaigns" ? { published_at: null } : {}),
        ...value,
        created_at: "2026-10-08T00:00:00.000Z",
        updated_at: "2026-10-08T00:00:00.000Z",
      }));
      return { data: this.insertedMany ? inserted : inserted[0], error: null };
    }

    const rows = (this.table === "campaigns" ? campaigns : modules).filter((row) =>
      this.filters.every(([column, value]) => row[column] === value)
    );
    return { data: rows.length === 1 && this.filters.some(([column]) => column === "id") ? rows[0] : rows, error: null };
  }

  maybeSingle() {
    const result = this.result();
    const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
    return Promise.resolve({ ...result, data });
  }

  single() {
    const result = this.result();
    const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
    return Promise.resolve({ ...result, data });
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }
}

const getCompanyAdminSupabase = jest.spyOn(employeeManagement, "getCompanyAdminSupabase");

function setupAdmin() {
  const supabase = {
    from: jest.fn((table: string) => new QueryBuilder(table)),
  };
  getCompanyAdminSupabase.mockResolvedValue({
    profile,
    supabase,
  } as unknown as Awaited<ReturnType<typeof employeeManagement.getCompanyAdminSupabase>>);
}

describe("company-scoped campaign management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    profile = { ...adminProfile };
    campaigns = [{ ...campaignA }, {
      ...campaignA,
      id: "campaign-other",
      company_id: "company-b",
    }];
    modules = [{
      id: "module-a",
      campaign_id: "campaign-a",
      title: "Introduction",
      description: null,
      content: null,
      estimated_minutes: 10,
      order_index: 0,
      status: "draft",
      created_at: "2026-10-08T00:00:00.000Z",
    }];
    insertedRows = [];
    queryLog = [];
    errorsByTable = {};
    setupAdmin();
  });

  it("creates a real draft campaign using the authenticated company and admin", async () => {
    const input: CreateCampaignInput = {
      name: "  Safety induction ",
      description: "  Annual training ",
      officialDeadline: "2026-12-31",
      bufferDays: 3,
    };
    const campaign = await createCompanyCampaign(input);

    expect(campaign).toMatchObject({
      company_id: "company-a",
      name: "Safety induction",
      description: "Annual training",
      official_deadline: "2026-12-31T00:00:00.000Z",
      learning_deadline: "2026-12-28T00:00:00.000Z",
      buffer_days: 3,
      status: "draft",
      created_by: "admin-a",
      published_at: null,
    });
    expect(insertedRows[0]).toEqual({
      table: "campaigns",
      values: [expect.objectContaining({
        company_id: "company-a",
        created_by: "admin-a",
        status: "draft",
      })],
    });
    expect(insertedRows[0]?.values[0]).not.toHaveProperty("published_at");
  });

  it("rejects unauthenticated users", async () => {
    getCompanyAdminSupabase.mockRejectedValue(new EmployeeAccessError("unauthenticated"));

    await expect(createCompanyCampaign({
      name: "Safety",
      officialDeadline: "2026-12-31",
    })).rejects.toBeInstanceOf(EmployeeAccessError);
    expect(insertedRows).toHaveLength(0);
  });

  it("rejects employees and profiles without a company", async () => {
    profile = { ...adminProfile, role: "employee" };
    setupAdmin();

    await expect(createCompanyCampaign({
      name: "Safety",
      officialDeadline: "2026-12-31",
    })).rejects.toMatchObject({ reason: "forbidden" });
    expect(insertedRows).toHaveLength(0);

    profile = { ...adminProfile, company_id: null as unknown as string };
    setupAdmin();
    await expect(getCompanyCampaigns()).rejects.toMatchObject({ reason: "forbidden" });
  });

  it("does not use browser-supplied company identifiers to determine tenancy", async () => {
    const input = {
      name: "Safety",
      officialDeadline: "2026-12-31",
      companyId: "company-attacker",
    } as CreateCampaignInput & { companyId: string };

    await createCompanyCampaign(input);

    expect(insertedRows[0]?.values[0]).toMatchObject({ company_id: "company-a" });
  });

  it("lists only the authenticated admin's company campaigns", async () => {
    const result = await getCompanyCampaigns();

    expect(result).toEqual([campaignA]);
    expect(queryLog.find((query) => query.table === "campaigns")?.filters).toContainEqual([
      "company_id",
      "company-a",
    ]);
  });

  it("retrieves an owned campaign using both campaign and company scope", async () => {
    await expect(getCompanyCampaignById("campaign-a")).resolves.toMatchObject({
      id: "campaign-a",
      company_id: "company-a",
    });
    expect(queryLog[0]?.filters).toEqual([
      ["id", "campaign-a"],
      ["company_id", "company-a"],
    ]);
  });

  it("returns not found for another company's campaign", async () => {
    await expect(getCompanyCampaignById("campaign-other")).rejects.toMatchObject({
      name: "CampaignManagementError",
      code: "not_found",
    });
    expect(queryLog[0]?.filters).toContainEqual(["company_id", "company-a"]);
  });

  it("creates draft modules only after verifying campaign ownership", async () => {
    const moduleInput: CreateLearningModuleInput[] = [{
      title: "  Introduction ",
      description: "  Start here ",
      content: "Module content",
      estimatedMinutes: 12,
      orderIndex: 2,
    }];

    const result = await createLearningModules("campaign-a", moduleInput);

    expect(result).toMatchObject([{
      campaign_id: "campaign-a",
      title: "Introduction",
      description: "Start here",
      content: "Module content",
      estimated_minutes: 12,
      order_index: 2,
      status: "draft",
    }]);
    expect(insertedRows[0]).toEqual({
      table: "learning_modules",
      values: [expect.objectContaining({
        campaign_id: "campaign-a",
        status: "draft",
      })],
    });
  });

  it("does not insert modules into another company's campaign", async () => {
    await expect(createLearningModules("campaign-other", [{ title: "Unsafe module" }])).rejects.toMatchObject({
      code: "not_found",
    });
    expect(insertedRows).toHaveLength(0);
  });

  it("lists modules only after verifying campaign ownership", async () => {
    const result = await getCampaignLearningModules("campaign-a");

    expect(result).toMatchObject([{ id: "module-a", campaign_id: "campaign-a" }]);
    expect(queryLog.find((query) => query.table === "learning_modules")?.filters).toContainEqual([
      "campaign_id",
      "campaign-a",
    ]);
  });

  it("rejects an empty trimmed campaign name", async () => {
    await expect(createCompanyCampaign({
      name: "   ",
      officialDeadline: "2026-12-31",
    })).rejects.toMatchObject({ code: "invalid" });
    expect(insertedRows).toHaveLength(0);
  });

  it("rejects invalid calendar deadlines", async () => {
    await expect(createCompanyCampaign({
      name: "Safety",
      officialDeadline: "2026-02-30",
    })).rejects.toBeInstanceOf(CampaignManagementError);
    expect(insertedRows).toHaveLength(0);
  });

  it("rejects negative buffer days", async () => {
    await expect(createCompanyCampaign({
      name: "Safety",
      officialDeadline: "2026-12-31",
      bufferDays: -1,
    })).rejects.toMatchObject({ code: "invalid" });
    expect(insertedRows).toHaveLength(0);
  });
});
