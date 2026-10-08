import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  EmployeeAccessError,
  filterEmployeesBySearch,
  getCompanyEmployee,
  getCompanyEmployeeDirectory,
} from "./employee-management.service";
import type { EmployeeListItem } from "@/types/admin-employee";

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

type Row = Record<string, unknown>;
type QueryError = { message: string };
type QueryResult = { data: Row[]; error: QueryError | null };

const adminProfile: Row = {
  id: "admin-1",
  company_id: "company-a",
  role: "admin",
};

const employeeA: Row = {
  id: "employee-a",
  company_id: "company-a",
  role: "employee",
  first_name: "Ari",
  last_name: "Jones",
  email: "ari@example.test",
  department_id: "department-a",
  job_title: "Technician",
  employee_number: "A-100",
  avatar_url: null,
  created_at: "2025-01-02T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
};

const companyEmployeeRows = [employeeA, {
  ...employeeA,
  id: "employee-b",
  first_name: "Sam",
  last_name: "Brown",
  email: "sam@example.test",
  department_id: null,
  employee_number: null,
}];

let rowsByTable: Record<string, Row[]>;
let errorsByTable: Record<string, QueryError>;
let queryLog: Array<{ table: string; filters: Array<[string, unknown]> }>;
let authenticatedUserId: string | null;

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

  order() {
    return this;
  }

  private result() {
    queryLog.push({ table: this.table, filters: [...this.filters] });
    const matchingRows = (rowsByTable[this.table] ?? []).filter((row) =>
      this.filters.every(([column, value]) => row[column] === value)
    );
    return {
      data: matchingRows,
      error: errorsByTable[this.table] ?? null,
    } satisfies QueryResult;
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
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: authenticatedUserId ? { id: authenticatedUserId } : null },
        error: null,
      })),
    },
    from: jest.fn((table: string) => new QueryBuilder(table)),
  };

  jest.mocked(createServerSupabaseClient).mockResolvedValue(
    mockClient as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  );
}

describe("Company Admin employee management data", () => {
  beforeEach(() => {
    rowsByTable = {
      profiles: [adminProfile, ...companyEmployeeRows],
      departments: [{ id: "department-a", company_id: "company-a", name: "Operations" }],
    };
    errorsByTable = {};
    queryLog = [];
    authenticatedUserId = "admin-1";
    installSupabaseMock();
  });

  it("scopes employee queries to the authenticated company and employee role", async () => {
    const directory = await getCompanyEmployeeDirectory();
    const profileQuery = queryLog.find((query) =>
      query.table === "profiles" && query.filters.some(([column]) => column === "role")
    );

    expect(profileQuery?.filters).toEqual(expect.arrayContaining([
      ["company_id", "company-a"],
      ["role", "employee"],
    ]));
    expect(directory.employees).toHaveLength(2);
    expect(directory.employees[0]).toMatchObject({
      departmentId: "department-a",
      departmentName: "Operations",
    });
  });

  it("accepts search only across persisted employee identity fields", () => {
    const employees: EmployeeListItem[] = [{
      id: "employee-a",
      firstName: "Ari",
      lastName: "Jones",
      email: "ari@example.test",
      departmentId: null,
      departmentName: null,
      jobTitle: null,
      employeeNumber: "A-100",
      avatarUrl: null,
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    }];

    expect(filterEmployeesBySearch(employees, "JONES")).toHaveLength(1);
    expect(filterEmployeesBySearch(employees, "A-100")).toHaveLength(1);
    expect(filterEmployeesBySearch(employees, "unknown")).toHaveLength(0);
  });

  it("validates department selection against departments in the authenticated company", async () => {
    const directory = await getCompanyEmployeeDirectory({ departmentId: "department-other-company" });

    expect(directory.employees).toEqual([]);
    expect(queryLog.some((query) =>
      query.table === "profiles" && query.filters.some(([column]) => column === "role")
    )).toBe(false);
    expect(queryLog.find((query) => query.table === "departments")?.filters).toContainEqual([
      "company_id",
      "company-a",
    ]);
  });

  it("applies a valid company department filter to the employee query", async () => {
    const directory = await getCompanyEmployeeDirectory({ departmentId: "department-a" });
    const employeeQuery = queryLog.find((query) =>
      query.table === "profiles" && query.filters.some(([column]) => column === "role")
    );

    expect(directory.employees.map((employee) => employee.id)).toEqual(["employee-a"]);
    expect(employeeQuery?.filters).toContainEqual(["company_id", "company-a"]);
    expect(employeeQuery?.filters).toContainEqual(["department_id", "department-a"]);
  });

  it("returns a real empty result when the company has no employee profiles", async () => {
    rowsByTable.profiles = [adminProfile];

    await expect(getCompanyEmployeeDirectory()).resolves.toMatchObject({ employees: [] });
  });

  it("returns not found for an employee outside the authenticated company", async () => {
    rowsByTable.profiles = [
      adminProfile,
      { ...employeeA, id: "employee-other", company_id: "company-b" },
    ];

    const employee = await getCompanyEmployee("employee-other");
    const employeeQuery = queryLog.find((query) =>
      query.table === "profiles" &&
      query.filters.some(([column, value]) => column === "id" && value === "employee-other")
    );

    expect(employee).toBeNull();
    expect(employeeQuery?.filters).toContainEqual(["company_id", "company-a"]);
    expect(employeeQuery?.filters).toContainEqual(["role", "employee"]);
  });

  it("rejects unauthenticated and non-admin callers", async () => {
    authenticatedUserId = null;
    await expect(getCompanyEmployeeDirectory()).rejects.toMatchObject({
      reason: "unauthenticated",
    });

    authenticatedUserId = "employee-a";
    await expect(getCompanyEmployeeDirectory()).rejects.toBeInstanceOf(EmployeeAccessError);
  });

  it("surfaces database failures instead of returning an empty employee list", async () => {
    errorsByTable.profiles = { message: "database unavailable" };

    await expect(getCompanyEmployeeDirectory()).rejects.toThrow(
      "Could not verify Company Admin access."
    );
  });
});
