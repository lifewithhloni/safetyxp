import { describe, expect, it, jest } from "@jest/globals";

const mockCreateCompanyEmployee = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/services/admin/employee-provisioning.service", () => ({
  createCompanyEmployee: mockCreateCompanyEmployee,
  EmployeeProvisioningError: class EmployeeProvisioningError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
      this.name = "EmployeeProvisioningError";
    }
  },
}));

import { POST } from "./route";
import { EmployeeProvisioningError } from "@/services/admin/employee-provisioning.service";

describe("POST /api/admin/employees", () => {
  it("returns only the safe provisioning message and reference", async () => {
    mockCreateCompanyEmployee.mockRejectedValue(
      new EmployeeProvisioningError(
        "database",
        "Employee setup failed and the created account was removed. Reference: abcdef12"
      )
    );

    const response = await POST(new Request("https://safetyxp.example/api/admin/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: "Ari",
        lastName: "Jones",
        email: "ari@example.test",
      }),
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Employee setup failed and the created account was removed. Reference: abcdef12",
    });
  });
});
