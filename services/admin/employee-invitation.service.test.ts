import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  acceptEmployeeInvitation,
  EmployeeInvitationError,
  getEmployeeInvitationByTokenHash,
} from "./employee-invitation.service";

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

type Invitation = {
  id: string;
  employee_id: string;
  token_hash: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expires_at: string;
  accepted_at: string | null;
};
type QueryResult = { data: unknown; error: { message: string } | null };

let invitation: Invitation;

class InvitationQuery implements PromiseLike<QueryResult> {
  private operation: "select" | "update" = "select";
  private value: Record<string, unknown> = {};
  private filters: Array<[string, unknown]> = [];

  constructor(private readonly table: string) {}

  select() { return this; }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  update(value: Record<string, unknown>) {
    this.operation = "update";
    this.value = value;
    return this;
  }

  private matches() {
    return this.table === "employee_invitations" &&
      this.filters.every(([column, value]) =>
        column === "expires_at" || invitation[column as keyof Invitation] === value
      );
  }

  private result(): QueryResult {
    if (!this.matches()) return { data: null, error: null };

    if (this.operation === "update") {
      const statusFilter = this.filters.find(([column]) => column === "status")?.[1];
      const expiryFilter = this.filters.find(([column]) => column === "expires_at")?.[1];
      if (statusFilter === "PENDING" && invitation.status !== "PENDING") {
        return { data: null, error: null };
      }
      if (typeof expiryFilter === "string" && Date.parse(invitation.expires_at) <= Date.parse(expiryFilter)) {
        return { data: null, error: null };
      }
      invitation = { ...invitation, ...this.value } as Invitation;
      return { data: this.filters.some(([column]) => column === "employee_id") ? { id: invitation.id } : null, error: null };
    }

    return { data: invitation, error: null };
  }

  maybeSingle() { return Promise.resolve(this.result()); }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }
}

describe("persisted employee invitation lifecycle", () => {
  beforeEach(() => {
    invitation = {
      id: "invitation-1",
      employee_id: "employee-1",
      token_hash: "auth-token-hash",
      status: "PENDING",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      accepted_at: null,
    };
    jest.mocked(supabaseAdmin.from).mockImplementation((table) => new InvitationQuery(table) as never);
  });

  it("looks up the persisted invitation by the Auth token hash", async () => {
    await expect(getEmployeeInvitationByTokenHash("auth-token-hash")).resolves.toMatchObject({
      id: "invitation-1",
      employee_id: "employee-1",
      status: "PENDING",
    });
    await expect(getEmployeeInvitationByTokenHash("wrong-token")).resolves.toBeNull();
  });

  it("accepts an invitation for its employee and is idempotent after acceptance", async () => {
    await expect(acceptEmployeeInvitation("invitation-1", "employee-1")).resolves.toEqual({
      accepted: true,
      alreadyAccepted: false,
    });
    expect(invitation).toMatchObject({ status: "ACCEPTED", accepted_at: expect.any(String) });
    await expect(acceptEmployeeInvitation("invitation-1", "employee-1")).resolves.toEqual({
      accepted: true,
      alreadyAccepted: true,
    });
  });

  it("rejects another employee attempting to accept the invitation", async () => {
    await expect(acceptEmployeeInvitation("invitation-1", "employee-other")).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("marks expired invitations and rejects them", async () => {
    invitation.expires_at = new Date(Date.now() - 60_000).toISOString();

    await expect(acceptEmployeeInvitation("invitation-1", "employee-1")).rejects.toMatchObject({
      code: "expired",
    });
    expect(invitation.status).toBe("EXPIRED");
  });

  it("rejects revoked and unknown invitations", async () => {
    invitation.status = "REVOKED";
    await expect(acceptEmployeeInvitation("invitation-1", "employee-1")).rejects.toBeInstanceOf(EmployeeInvitationError);
    await expect(acceptEmployeeInvitation("missing", "employee-1")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
