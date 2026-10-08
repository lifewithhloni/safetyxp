import { describe, expect, it } from "@jest/globals";
import { isPasswordValid, validatePassword } from "./password-policy";

describe("employee activation password policy", () => {
  it("rejects passwords shorter than 12 characters", () => {
    expect(validatePassword("Abcdef1!xyz").minLength).toBe(false);
    expect(isPasswordValid("Abcdef1!xyz")).toBe(false);
  });

  it("accepts a 12-character password that meets every requirement", () => {
    expect(isPasswordValid("Abcdefg1!xyz")).toBe(true);
  });

  it("requires at least one uppercase letter", () => {
    expect(validatePassword("abcdefg1!xyz").uppercase).toBe(false);
    expect(isPasswordValid("abcdefg1!xyz")).toBe(false);
  });

  it("requires at least one lowercase letter", () => {
    expect(validatePassword("ABCDEFG1!XYZ").lowercase).toBe(false);
    expect(isPasswordValid("ABCDEFG1!XYZ")).toBe(false);
  });

  it("requires at least one number", () => {
    expect(validatePassword("Abcdefgh!xyzq").number).toBe(false);
    expect(isPasswordValid("Abcdefgh!xyzq")).toBe(false);
  });

  it("requires at least one special character", () => {
    expect(validatePassword("Abcdefgh1xyzq").special).toBe(false);
    expect(isPasswordValid("Abcdefgh1xyzq")).toBe(false);
  });

  it("rejects whitespace without altering the submitted password", () => {
    const password = "Abc def1!xyz";
    expect(validatePassword(password).noWhitespace).toBe(false);
    expect(isPasswordValid(password)).toBe(false);
  });

  it.each(["password123!", "safetyxp123!", "company123!", "letmein"])(
    "rejects an obvious weak password: %s",
    (password) => {
      expect(validatePassword(password).commonPassword).toBe(true);
      expect(isPasswordValid(password)).toBe(false);
    }
  );

  it("checks obvious weak passwords case-insensitively", () => {
    expect(validatePassword("Password123!").commonPassword).toBe(true);
    expect(validatePassword("SAFETYXP123!").commonPassword).toBe(true);
    expect(isPasswordValid("Password123!")).toBe(false);
  });

  it("accepts a strong password not in the obvious weak-password list", () => {
    expect(isPasswordValid("N0rth!River#47")).toBe(true);
  });
});
