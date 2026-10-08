import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, jest } from "@jest/globals";
import {
  EmployeeActivationSuccess,
  scheduleActivationRedirect,
  submitEmployeeActivation,
  type ActivationDependencies,
} from "./employee-activation-form";

const validInvitationId = "11111111-1111-4111-8111-111111111111";

function createDependencies(): jest.Mocked<ActivationDependencies> {
  return {
    verifyOtp: jest.fn<ActivationDependencies["verifyOtp"]>().mockResolvedValue({
      data: { user: { id: "employee-1" } },
      error: null,
    }),
    updatePassword: jest.fn<ActivationDependencies["updatePassword"]>().mockResolvedValue({ error: null }),
    acceptInvitation: jest.fn<ActivationDependencies["acceptInvitation"]>().mockResolvedValue(true),
    setError: jest.fn<ActivationDependencies["setError"]>(),
    onSuccess: jest.fn<ActivationDependencies["onSuccess"]>(),
    navigateHome: jest.fn<ActivationDependencies["navigateHome"]>(),
  };
}

async function submit(
  dependencies: jest.Mocked<ActivationDependencies>,
  values: Partial<{
    invitationId: string | null;
    tokenHash: string | null;
    password: string;
    confirmPassword: string;
  }> = {}
) {
  return submitEmployeeActivation({
    invitationId: values.invitationId === undefined ? validInvitationId : values.invitationId,
    tokenHash: values.tokenHash === undefined ? "invite-token-hash" : values.tokenHash,
    password: values.password ?? "unique-password",
    confirmPassword: values.confirmPassword ?? "unique-password",
    dependencies,
  });
}

describe("employee invitation activation", () => {
  it("rejects a missing or malformed invitation ID before verifying the token", async () => {
    const dependencies = createDependencies();

    await submit(dependencies, { invitationId: null });

    expect(dependencies.verifyOtp).not.toHaveBeenCalled();
    expect(dependencies.setError).toHaveBeenLastCalledWith(
      "This invitation link is invalid or has expired. Please ask your company administrator to send you a new invitation."
    );

    await submit(dependencies, { invitationId: "not-a-uuid" });
    expect(dependencies.verifyOtp).not.toHaveBeenCalled();
  });

  it("rejects a missing token_hash before verifying the invitation", async () => {
    const dependencies = createDependencies();

    await submit(dependencies, { tokenHash: "  " });

    expect(dependencies.verifyOtp).not.toHaveBeenCalled();
    expect(dependencies.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than eight characters", async () => {
    const dependencies = createDependencies();

    await submit(dependencies, { password: "short", confirmPassword: "short" });

    expect(dependencies.verifyOtp).not.toHaveBeenCalled();
    expect(dependencies.setError).toHaveBeenLastCalledWith("Password must be at least 8 characters long.");
  });

  it("rejects a password confirmation mismatch", async () => {
    const dependencies = createDependencies();

    await submit(dependencies, { confirmPassword: "different-password" });

    expect(dependencies.verifyOtp).not.toHaveBeenCalled();
    expect(dependencies.setError).toHaveBeenLastCalledWith("Passwords do not match.");
  });

  it("shows a friendly expired-invitation message when verifyOtp fails", async () => {
    const dependencies = createDependencies();
    dependencies.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: new Error("internal authentication details"),
    });

    await submit(dependencies);

    expect(dependencies.updatePassword).not.toHaveBeenCalled();
    expect(dependencies.acceptInvitation).not.toHaveBeenCalled();
    expect(dependencies.setError).toHaveBeenLastCalledWith(
      "This invitation link is invalid or has expired. Please ask your company administrator to send you a new invitation."
    );
    expect(dependencies.setError).not.toHaveBeenCalledWith("internal authentication details");
  });

  it("does not accept the invitation if password update fails", async () => {
    const dependencies = createDependencies();
    dependencies.updatePassword.mockResolvedValue({ error: new Error("provider detail") });

    await submit(dependencies);

    expect(dependencies.verifyOtp).toHaveBeenCalledWith("invite-token-hash");
    expect(dependencies.acceptInvitation).not.toHaveBeenCalled();
    expect(dependencies.onSuccess).not.toHaveBeenCalled();
    expect(dependencies.setError).toHaveBeenLastCalledWith(
      "We couldn't finish creating your password. Please try again."
    );
  });

  it("does not show success if invitation acceptance fails", async () => {
    const dependencies = createDependencies();
    dependencies.acceptInvitation.mockResolvedValue(false);

    await submit(dependencies);

    expect(dependencies.updatePassword).toHaveBeenCalledWith("unique-password");
    expect(dependencies.acceptInvitation).toHaveBeenCalledWith(validInvitationId);
    expect(dependencies.onSuccess).not.toHaveBeenCalled();
    expect(dependencies.navigateHome).not.toHaveBeenCalled();
    expect(dependencies.setError).toHaveBeenLastCalledWith(
      "We couldn't activate your invitation. Please contact your company administrator."
    );
  });

  it("activates successfully, displays confirmation, and redirects to the role-aware root", async () => {
    const dependencies = createDependencies();
    const router = {
      push: jest.fn<(path: string) => void>(),
      refresh: jest.fn<() => void>(),
    };
    let redirectCallback: (() => void) | undefined;
    let redirectDelay = 0;
    dependencies.navigateHome.mockImplementation((delayMs) => scheduleActivationRedirect(
      router,
      (callback, delay) => {
        redirectCallback = callback;
        redirectDelay = delay;
      },
      delayMs
    ));

    await expect(submit(dependencies)).resolves.toBe(true);

    expect(dependencies.verifyOtp).toHaveBeenCalledWith("invite-token-hash");
    expect(dependencies.updatePassword).toHaveBeenCalledWith("unique-password");
    expect(dependencies.acceptInvitation).toHaveBeenCalledWith(validInvitationId);
    expect(dependencies.onSuccess).toHaveBeenCalledTimes(1);
    expect(redirectDelay).toBe(1300);
    expect(renderToStaticMarkup(createElement(EmployeeActivationSuccess))).toContain(
      "Your account has been created"
    );

    redirectCallback?.();
    expect(router.push).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
