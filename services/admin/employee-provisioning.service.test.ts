import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/security/sentry-server";
import * as employeeManagement from "@/services/admin/employee-management.service";
import { EmployeeAccessError, getCompanyAdminSupabase } from "@/services/admin/employee-management.service";
import { sendTemplatedEmail } from "@/services/email/email.service";
import {
  createCompanyEmployee,
  importCompanyEmployees,
} from "./employee-provisioning.service";

jest.mock("@/lib/security/sentry-server", () => ({
  reportServerError: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: jest.fn(),
        generateLink: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
    from: jest.fn(),
  },
}));

jest.mock("@/services/email/email.service", () => ({
  sendTemplatedEmail: jest.fn(),
}));

type DatabaseError = { message: string; code?: string };
type QueryResult = { data: unknown; error: DatabaseError | null };
type QueryOperation = "select" | "insert" | "update" | "delete";

const adminProfile = { id: "admin-1", company_id: "company-a", role: "admin" };
const existingProfiles: Array<{ email: string; employee_number: string | null }> = [];
const profileInserts: Array<Record<string, unknown>> = [];
const invitationInserts: Array<Record<string, unknown>> = [];
const departmentInserts: Array<Record<string, unknown>> = [];
const existingDepartments: Array<{ id: string; company_id: string; name: string }> = [
  { id: "department-a", company_id: "company-a", name: "Operations" },
];
const updates: Array<{ table: string; value: Record<string, unknown> }> = [];
const queryFilters: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
const mockGetCompanyAdminSupabase = jest.spyOn(employeeManagement, "getCompanyAdminSupabase");
let departmentExists: boolean;
let nextAuthId: number;
let nextDepartmentId: number;
let simulateDepartmentInsertConflict: boolean;
let consoleError: jest.SpiedFunction<typeof console.error>;

class QueryBuilder implements PromiseLike<QueryResult> {
  private operation: QueryOperation = "select";
  private filters: Array<[string, unknown]> = [];
  private value: Record<string, unknown> = {};

  constructor(private readonly table: string) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  range() {
    return this;
  }

  insert(value: Record<string, unknown>) {
    this.operation = "insert";
    this.value = value;
    return this;
  }

  update(value: Record<string, unknown>) {
    this.operation = "update";
    this.value = value;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  private result(): QueryResult {
    queryFilters.push({ table: this.table, filters: [...this.filters] });
    if (this.operation === "select" && this.table === "profiles") {
      return { data: existingProfiles, error: null };
    }
    if (this.operation === "select" && this.table === "departments") {
      const isSpecificDepartment = this.filters.some(([column]) => column === "id");
      const companyFilter = this.filters.find(([column]) => column === "company_id")?.[1];
      const departmentId = this.filters.find(([column]) => column === "id")?.[1];
      return {
        data: isSpecificDepartment
          ? departmentExists ? { id: departmentId } : null
          : existingDepartments.filter((department) => department.company_id === companyFilter),
        error: null,
      };
    }
    if (this.operation === "insert" && this.table === "profiles") {
      profileInserts.push(this.value);
    }
    if (this.operation === "insert" && this.table === "employee_invitations") {
      invitationInserts.push(this.value);
    }
    if (this.operation === "insert" && this.table === "departments") {
      departmentInserts.push(this.value);
      if (simulateDepartmentInsertConflict) {
        existingDepartments.push({
          id: `department-${nextDepartmentId++}`,
          company_id: String(this.value.company_id),
          name: String(this.value.name),
        });
        return { data: null, error: { message: "duplicate department", code: "23505" } };
      }
      const insertedDepartment = {
        id: `department-${nextDepartmentId++}`,
        company_id: String(this.value.company_id),
        name: String(this.value.name),
      };
      existingDepartments.push(insertedDepartment);
      return { data: { id: insertedDepartment.id }, error: null };
    }
    if (this.operation === "update") {
      updates.push({ table: this.table, value: this.value });
    }
    return { data: null, error: null };
  }

  maybeSingle() {
    return Promise.resolve(this.result());
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }
}

const validEmployee = {
  firstName: "Ari",
  lastName: "Jones",
  email: "ari@example.test",
  employeeNumber: null,
  jobTitle: "Technician",
  department: null,
  departmentId: null,
};

function setupAdmin() {
  mockGetCompanyAdminSupabase.mockResolvedValue({
    profile: adminProfile,
    supabase: {},
  } as Awaited<ReturnType<typeof getCompanyAdminSupabase>>);
}

describe("Company Admin employee provisioning", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    existingProfiles.splice(0);
    profileInserts.splice(0);
    invitationInserts.splice(0);
    departmentInserts.splice(0);
    existingDepartments.splice(0, existingDepartments.length, {
      id: "department-a",
      company_id: "company-a",
      name: "Operations",
    });
    updates.splice(0);
    queryFilters.splice(0);
    departmentExists = true;
    nextAuthId = 1;
    nextDepartmentId = 1;
    simulateDepartmentInsertConflict = false;
    process.env.NEXT_PUBLIC_APP_URL = "https://safetyxp.example";
    setupAdmin();

    jest.mocked(supabaseAdmin.from).mockImplementation((table) =>
      new QueryBuilder(table) as never
    );
    jest.mocked(supabaseAdmin.auth.admin.createUser).mockImplementation(async () => ({
      data: { user: { id: `employee-${nextAuthId++}` } },
      error: null,
    }) as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.createUser>>);
    jest.mocked(supabaseAdmin.auth.admin.generateLink).mockImplementation(async () => ({
      data: {
        properties: {
          action_link: "https://auth.example.test/invite?token=one",
          hashed_token: "stored-auth-token-hash",
        },
      },
      error: null,
    }) as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.generateLink>>);
    jest.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
      data: { user: { id: "employee-1" } },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.deleteUser>>);
    jest.mocked(sendTemplatedEmail).mockResolvedValue({
      success: true,
      provider: "mock",
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("creates a company-scoped Auth user, profile, and persisted invitation", async () => {
    const result = await createCompanyEmployee({
      ...validEmployee,
      departmentId: "department-a",
    });

    expect(result).toMatchObject({
      employeeId: "employee-1",
      invitationQueued: false,
      emailProvider: "mock",
    });
    expect(profileInserts[0]).toMatchObject({
      id: "employee-1",
      company_id: "company-a",
      role: "employee",
      department_id: "department-a",
    });
    expect(invitationInserts[0]).toMatchObject({
      company_id: "company-a",
      employee_id: "employee-1",
      email: "ari@example.test",
      token_hash: "stored-auth-token-hash",
      status: "PENDING",
      invited_by: "admin-1",
    });
    expect(queryFilters.find((query) => query.table === "departments")?.filters).toEqual(
      expect.arrayContaining([
        ["id", "department-a"],
        ["company_id", "company-a"],
      ])
    );
    expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email_confirm: false })
    );
    expect(jest.mocked(supabaseAdmin.auth.admin.createUser).mock.calls[0]?.[0]).not.toHaveProperty("password");
    expect(supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({
      type: "invite",
      email: "ari@example.test",
      options: expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/confirm?next="),
      }),
    }));
  });

  it("continues to select an existing company department without creating one", async () => {
    await createCompanyEmployee({
      ...validEmployee,
      departmentId: "department-a",
    });

    expect(profileInserts[0]).toMatchObject({ department_id: "department-a" });
    expect(departmentInserts).toHaveLength(0);
  });

  it("creates a trimmed company department and assigns it to the new employee", async () => {
    await createCompanyEmployee({
      ...validEmployee,
      newDepartmentName: "  Construction & Safety  ",
    });

    expect(departmentInserts).toEqual([{
      company_id: "company-a",
      name: "Construction & Safety",
    }]);
    expect(profileInserts[0]).toMatchObject({ department_id: "department-1" });
    expect(invitationInserts[0]).toMatchObject({
      employee_id: "employee-1",
      company_id: "company-a",
      status: "PENDING",
    });
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty new department name before creating an employee", async () => {
    await expect(createCompanyEmployee({
      ...validEmployee,
      newDepartmentName: "   ",
    })).rejects.toMatchObject({ code: "invalid" });

    expect(departmentInserts).toHaveLength(0);
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("reuses departments case-insensitively after trimming", async () => {
    await createCompanyEmployee({
      ...validEmployee,
      newDepartmentName: "  oPeRaTiOnS ",
    });

    expect(departmentInserts).toHaveLength(0);
    expect(profileInserts[0]).toMatchObject({ department_id: "department-a" });
  });

  it("reuses a department created concurrently after a unique-index conflict", async () => {
    simulateDepartmentInsertConflict = true;

    await createCompanyEmployee({
      ...validEmployee,
      newDepartmentName: "New Department",
    });

    expect(departmentInserts).toHaveLength(1);
    expect(profileInserts[0]).toMatchObject({ department_id: "department-1" });
  });

  it("does not reuse a same-named department from another company", async () => {
    existingDepartments.push({
      id: "department-other",
      company_id: "company-b",
      name: "Construction & Safety",
    });

    await createCompanyEmployee({
      ...validEmployee,
      newDepartmentName: "Construction & Safety",
    });

    expect(departmentInserts).toEqual([{
      company_id: "company-a",
      name: "Construction & Safety",
    }]);
    expect(profileInserts[0]).toMatchObject({ company_id: "company-a" });
  });

  it("rejects duplicate company emails without creating Auth users", async () => {
    existingProfiles.push({ email: "ARI@example.test", employee_number: null });

    await expect(createCompanyEmployee(validEmployee)).rejects.toMatchObject({
      code: "duplicate",
    });
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("rejects invalid email addresses before creating Auth users", async () => {
    await expect(createCompanyEmployee({ ...validEmployee, email: "not-an-email" })).rejects.toMatchObject({
      code: "invalid",
    });
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("rejects departments outside the authenticated admin company", async () => {
    departmentExists = false;

    await expect(createCompanyEmployee({
      ...validEmployee,
      departmentId: "department-other-company",
    })).rejects.toMatchObject({ code: "department" });
    expect(queryFilters.find((query) => query.table === "departments")?.filters).toContainEqual([
      "company_id",
      "company-a",
    ]);
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated company administrator", async () => {
    mockGetCompanyAdminSupabase.mockRejectedValue(new EmployeeAccessError("forbidden"));

    await expect(createCompanyEmployee(validEmployee)).rejects.toBeInstanceOf(EmployeeAccessError);
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("does not reuse an existing Auth account", async () => {
    jest.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    } as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.createUser>>);

    await expect(createCompanyEmployee(validEmployee)).rejects.toMatchObject({
      code: "auth-conflict",
    });
    expect(profileInserts).toHaveLength(0);
  });

  it("compensates account and invitation records when email delivery fails", async () => {
    jest.mocked(sendTemplatedEmail).mockResolvedValue({
      success: false,
      provider: "resend",
      reason: "provider error",
    });

    await expect(createCompanyEmployee(validEmployee)).rejects.toMatchObject({ code: "email" });

    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("employee-1");
    expect(updates).toContainEqual({
      table: "employee_invitations",
      value: { status: "REVOKED" },
    });
  });

  it("captures the safe failure stage and rolls back without logging sensitive exception data", async () => {
    const originalError = new Error(
      "Invite failure for ari@example.test: Authorization: Bearer topsecret access_token=private sk_safesecretvalue password=secretpass https://internal.example/path?token=hidden"
    );
    jest.mocked(supabaseAdmin.auth.admin.generateLink).mockRejectedValue(originalError);

    await expect(createCompanyEmployee(validEmployee)).rejects.toMatchObject({
      name: "EmployeeProvisioningError",
      message: expect.stringMatching(/^Employee setup failed and the created account was removed\. Reference: [a-f0-9]{8}$/),
    });

    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("employee-1");
    expect(profileInserts).toHaveLength(1);
    expect(invitationInserts).toHaveLength(0);
    expect(reportServerError).toHaveBeenCalledWith(
      originalError,
      expect.objectContaining({
        component: "employee-provisioning",
        operation: "create_employee",
        failure_scope: "invitation_link_generation",
        attempt_id: expect.any(String),
      })
    );

    const logCall = consoleError.mock.calls[0]?.[0];
    expect(typeof logCall).toBe("string");
    const diagnostic = JSON.parse(String(logCall)) as Record<string, unknown>;
    expect(diagnostic).toMatchObject({
      event: "employee_provisioning_failed",
      stage: "invitation_link_generation",
      errorName: "Error",
      authUserCreated: true,
      profileCreated: true,
      invitationPersisted: false,
      emailSendingStarted: false,
      rollbackAttempted: true,
      rollbackCompleted: true,
    });
    expect(diagnostic.errorMessage).toContain("[email redacted]");
    for (const secret of [
      "ari@example.test",
      "topsecret",
      "private",
      "sk_safesecretvalue",
      "secretpass",
      "internal.example",
      "hidden",
    ]) {
      expect(String(logCall)).not.toContain(secret);
    }
  });

  it("imports valid rows while reporting invalid and already-existing rows", async () => {
    existingProfiles.push({ email: "existing@example.test", employee_number: null });
    const csv = [
      "First Name,Last Name,Email,Employee Number,Department",
      "Ari,Jones,ari@example.test,A-1,Operations",
      "Sam,,invalid-email,A-2,Operations",
      "Lee,Green,existing@example.test,,",
    ].join("\n");

    const result = await importCompanyEmployees(csv);

    expect(result).toMatchObject({
      created: 1,
      invitationsQueued: 0,
      skipped: 1,
      errors: 1,
    });
    expect(result.rows.map((row) => row.status)).toEqual(["created", "error", "skipped"]);
    expect(profileInserts).toHaveLength(1);
    expect(invitationInserts).toHaveLength(1);
  });
});
