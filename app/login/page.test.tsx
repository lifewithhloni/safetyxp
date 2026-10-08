import { describe, expect, it, jest } from "@jest/globals";
import { getLoginRedirect, submitLogin } from "@/app/login/page";

const genericCredentialsError = "Your email or password is incorrect. Please try again.";
const genericRequestError = "Unable to sign in right now. Please try again.";

function createLoginState() {
  return {
    router: {
      push: jest.fn<(path: string) => void>(),
      refresh: jest.fn<() => void>(),
    },
    setError: jest.fn<(error: string | null) => void>(),
    setIsLoading: jest.fn<(isLoading: boolean) => void>(),
  };
}

describe("login submission", () => {
  it("preserves a requested redirect and defaults to the role-aware root route", () => {
    expect(getLoginRedirect(new URLSearchParams("redirect=%2Ftoday"))).toBe("/today");
    expect(getLoginRedirect(new URLSearchParams())).toBe("/");
    expect(getLoginRedirect(new URLSearchParams("redirect=%2Fprofile"))).toBe("/profile");
  });

  it("redirects after successful sign-in and clears loading", async () => {
    const state = createLoginState();

    await submitLogin({
      signIn: async () => ({ data: { user: { id: "user-id" } }, error: null }),
      redirectTo: "/today",
      ...state,
    });

    expect(state.router.push).toHaveBeenCalledWith("/today");
    expect(state.router.refresh).toHaveBeenCalledTimes(1);
    expect(state.setError).toHaveBeenCalledWith(null);
    expect(state.setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(state.setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it("shows the existing generic error for an authentication error and clears loading", async () => {
    const state = createLoginState();

    await submitLogin({
      signIn: async () => ({ data: { user: null }, error: new Error("sensitive provider detail") }),
      redirectTo: "/today",
      ...state,
    });

    expect(state.router.push).not.toHaveBeenCalled();
    expect(state.router.refresh).not.toHaveBeenCalled();
    expect(state.setError).toHaveBeenLastCalledWith(genericCredentialsError);
    expect(state.setError).not.toHaveBeenCalledWith("sensitive provider detail");
    expect(state.setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it("shows a safe error when sign-in rejects and clears loading", async () => {
    const state = createLoginState();

    await submitLogin({
      signIn: async () => {
        throw new Error("sensitive network detail");
      },
      redirectTo: "/today",
      ...state,
    });

    expect(state.router.push).not.toHaveBeenCalled();
    expect(state.router.refresh).not.toHaveBeenCalled();
    expect(state.setError).toHaveBeenLastCalledWith(genericRequestError);
    expect(state.setError).not.toHaveBeenCalledWith("sensitive network detail");
    expect(state.setIsLoading).toHaveBeenLastCalledWith(false);
  });
});
