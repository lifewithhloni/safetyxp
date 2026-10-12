import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as employeeManagement from "@/services/admin/employee-management.service";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import type {
  CreateCampaignInput,
  CreateLearningModuleInput,
} from "./campaign-management.service";
import {
  assignEmployeesToCampaign,
  CampaignManagementError,
  createCompanyCampaign,
  createLearningModules,
  getCampaignAssignmentData,
  getCampaignLearningModules,
  getCompanyCampaignById,
  getCompanyCampaigns,
} from "./campaign-management.service";

type Row = Record<string, unknown>;
type QueryError = { message: string };
type QueryResult = { data: unknown; error: QueryError | null };
type Operation = "select" | "insert" | "upsert";

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
let profiles: Row[];
let participants: Row[];
let insertedRows: Array<{ table: string; values: Row[] }>;
let queryLog: Array<{ table: string; operation: Operation; filters: Array<[string, unknown]> }>;
let errorsByTable: Record<string, QueryError>;
let profile: typeof adminProfile;

class QueryBuilder implements PromiseLike<QueryResult> {
  private operation: Operation = "select";
  private filters: Array<[string, unknown]> = [];
  private inFilters: Array<[string, unknown[]]> = [];
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

  in(column: string, values: unknown[]) {
    this.inFilters.push([column, values]);
    return this;
  }

  insert(values: Row | Row[]) {
    this.operation = "insert";
    this.insertedMany = Array.isArray(values);
    this.values = Array.isArray(values) ? values : [values];
    return this;
  }

  upsert(values: Row | Row[]) {
    this.operation = "upsert";
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

    if (this.operation === "upsert") {
      const inserted: Row[] = this.values.filter((value) =>
        !participants.some((participant) =>
          participant.campaign_id === value.campaign_id &&
          participant.employee_id === value.employee_id
        )
      ).map((value, index) => ({
        id: `participant-inserted-${index + 1}`,
        assigned_at: "2026-10-08T12:00:00.000Z",
        status: "assigned",
        completion_percentage: 0,
        completed_at: null,
        ...value,
      }));
      participants.push(...inserted);
      insertedRows.push({ table: this.table, values: this.values });
      return { data: inserted.map(({ employee_id }) => ({ employee_id })), error: null };
    }

    const source = this.table === "campaigns" ? campaigns
      : this.table === "learning_modules" ? modules
        : this.table === "profiles" ? profiles
          : participants;
    const rows = source.filter((row) =>
      this.filters.every(([column, value]) => row[column] === value) &&
      this.inFilters.every(([column, values]) => values.includes(row[column]))
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
    profiles = [{
      id: "employee-a",
      company_id: "company-a",
      role: "employee",
      first_name: "Avery",
      last_name: "Employee",
      email: "avery@example.test",
      employee_number: "A-1",
    }, {
      id: "employee-b",
      company_id: "company-b",
      role: "employee",
      first_name: "Blair",
      last_name: "Other",
      email: "blair@example.test",
      employee_number: "B-1",
    }, {
      id: "admin-a",
      company_id: "company-a",
      role: "admin",
      first_name: "Casey",
      last_name: "Admin",
      email: "admin@example.test",
      employee_number: null,
    }];
    participants = [];
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
      id: "learning_modules-inserted-1",
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

  it("rejects unauthenticated and non-admin module creation", async () => {
    getCompanyAdminSupabase.mockRejectedValue(new EmployeeAccessError("unauthenticated"));
    await expect(createLearningModules("campaign-a", [{ title: "Introduction" }]))
      .rejects.toBeInstanceOf(EmployeeAccessError);
    expect(insertedRows).toHaveLength(0);

    profile = { ...adminProfile, role: "employee" };
    setupAdmin();
    await expect(createLearningModules("campaign-a", [{ title: "Introduction" }]))
      .rejects.toMatchObject({ reason: "forbidden" });
    expect(insertedRows).toHaveLength(0);
  });

  it("ignores client company and status values and persists the module as draft", async () => {
    const untrustedInput = {
      title: "First aid",
      company_id: "company-b",
      status: "published",
    } as unknown as CreateLearningModuleInput;

    const result = await createLearningModules("campaign-a", [untrustedInput]);

    expect(result[0]).toMatchObject({
      id: "learning_modules-inserted-1",
      campaign_id: "campaign-a",
      status: "draft",
    });
    expect(insertedRows[0]?.values[0]).not.toHaveProperty("company_id");
    expect(insertedRows[0]?.values[0]).not.toHaveProperty("status", "published");
  });

  it("rejects invalid module input before attempting persistence", async () => {
    await expect(createLearningModules("campaign-a", [{ title: "  " }]))
      .rejects.toMatchObject({ code: "invalid" });
    await expect(createLearningModules("campaign-a", [{
      title: "Introduction",
      estimatedMinutes: -1,
    }])).rejects.toMatchObject({ code: "invalid" });
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

  it("loads only company employee profiles and persisted campaign participants", async () => {
    participants = [{
      id: "participant-existing",
      campaign_id: "campaign-a",
      employee_id: "employee-a",
      assigned_at: "2026-10-08T12:00:00.000Z",
      status: "assigned",
      completion_percentage: 0,
      completed_at: null,
    }];

    const result = await getCampaignAssignmentData("campaign-a");

    expect(result.eligibleEmployees).toEqual([]);
    expect(result.participants).toMatchObject([{
      id: "participant-existing",
      employee_id: "employee-a",
      employee: { id: "employee-a", first_name: "Avery", email: "avery@example.test" },
    }]);
    expect(queryLog.find((query) => query.table === "profiles")?.filters).toEqual([
      ["company_id", "company-a"],
      ["role", "employee"],
    ]);
  });

  it("rejects another company's campaign and unauthenticated or non-admin assignment reads", async () => {
    await expect(getCampaignAssignmentData("campaign-other")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(queryLog.some((query) => query.table === "profiles")).toBe(false);

    getCompanyAdminSupabase.mockRejectedValue(new EmployeeAccessError("unauthenticated"));
    await expect(getCampaignAssignmentData("campaign-a")).rejects.toBeInstanceOf(EmployeeAccessError);

    profile = { ...adminProfile, role: "employee" };
    setupAdmin();
    await expect(getCampaignAssignmentData("campaign-a")).rejects.toMatchObject({ reason: "forbidden" });
  });

  it("assigns only verified company employees and ignores privileged client fields", async () => {
    const input = {
      employeeIds: ["employee-a"],
      company_id: "company-b",
      status: "completed",
      completion_percentage: 100,
    } as unknown as { employeeIds: string[] };

    const result = await assignEmployeesToCampaign("campaign-a", input);

    expect(result.newlyAssignedEmployeeIds).toEqual(["employee-a"]);
    expect(result.alreadyAssignedEmployeeIds).toEqual([]);
    expect(result.participants).toMatchObject([{
      campaign_id: "campaign-a",
      employee_id: "employee-a",
      status: "assigned",
      completion_percentage: 0,
    }]);
    expect(insertedRows).toEqual([{
      table: "campaign_participants",
      values: [{ campaign_id: "campaign-a", employee_id: "employee-a" }],
    }]);
    expect(queryLog.find((query) => query.table === "profiles")?.filters)
      .toEqual([["company_id", "company-a"], ["role", "employee"]]);
  });

  it("denies cross-company employees and another company's campaign", async () => {
    await expect(assignEmployeesToCampaign("campaign-a", { employeeIds: ["employee-b"] }))
      .rejects.toMatchObject({ code: "invalid" });
    await expect(assignEmployeesToCampaign("campaign-other", { employeeIds: ["employee-a"] }))
      .rejects.toMatchObject({ code: "not_found" });
    expect(insertedRows).toHaveLength(0);
  });

  it("makes repeated assignment requests idempotent and reports existing assignments", async () => {
    const first = await assignEmployeesToCampaign("campaign-a", { employeeIds: ["employee-a"] });
    const second = await assignEmployeesToCampaign("campaign-a", { employeeIds: ["employee-a"] });

    expect(first.newlyAssignedEmployeeIds).toEqual(["employee-a"]);
    expect(second.newlyAssignedEmployeeIds).toEqual([]);
    expect(second.alreadyAssignedEmployeeIds).toEqual(["employee-a"]);
    expect(participants).toHaveLength(1);
    expect(insertedRows).toHaveLength(1);
  });

  it("rejects empty or malformed assignments and hides database details", async () => {
    await expect(assignEmployeesToCampaign("campaign-a", { employeeIds: [] }))
      .rejects.toMatchObject({ code: "invalid" });
    await expect(assignEmployeesToCampaign("campaign-a", { employeeIds: [" ", "employee-a"] }))
      .rejects.toMatchObject({ code: "invalid" });
    expect(insertedRows).toHaveLength(0);

    errorsByTable.profiles = { message: "private database error" };
    await expect(assignEmployeesToCampaign("campaign-a", { employeeIds: ["employee-a"] }))
      .rejects.toMatchObject({
        code: "database",
        message: "Could not verify the selected employees.",
      });
    expect(insertedRows).toHaveLength(0);
  });
});
