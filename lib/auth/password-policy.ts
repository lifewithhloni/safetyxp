export type PasswordPolicyResult = {
  valid: boolean;
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  noWhitespace: boolean;
  commonPassword: boolean;
};

const weakPasswords = new Set([
  "password",
  "password123",
  "password123!",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwerty123!",
  "welcome",
  "welcome123",
  "welcome123!",
  "admin",
  "admin123",
  "admin123!",
  "safety",
  "safety123",
  "safety123!",
  "safetyxp",
  "safetyxp123",
  "safetyxp123!",
  "company123",
  "company123!",
  "letmein",
  "changeme",
]);

export function validatePassword(password: string): PasswordPolicyResult {
  const minLength = password.length >= 12;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const special = /[^\p{L}\p{N}]/u.test(password);
  const noWhitespace = !/\s/.test(password);
  const commonPassword = weakPasswords.has(password.trim().toLowerCase());

  return {
    valid: minLength && uppercase && lowercase && number && special && noWhitespace && !commonPassword,
    minLength,
    uppercase,
    lowercase,
    number,
    special,
    noWhitespace,
    commonPassword,
  };
}

export function isPasswordValid(password: string) {
  return validatePassword(password).valid;
}
