// ---------------------------------------------------------------------------
// Live-test target guard. The only projects the live RLS test (and its recovery
// cleanup) may ever touch are listed here, in code. Environment variables can
// narrow the target but never authorize a new one, so pointing the environment
// at Production or any other project fails before a client is created.
// ---------------------------------------------------------------------------

// Dedicated SafetyXP Staging project. Adding a project here is a reviewed code change.
export const AUTHORIZED_PROJECT_REFS = Object.freeze(["uyblrfweabzagxrpyvzr"]);

const SUPABASE_HOST_PATTERN = /^([a-z0-9]{20})\.supabase\.co$/;

export class TargetGuardError extends Error {
  constructor(message) {
    super(`Live test target rejected: ${message}`);
    this.name = "TargetGuardError";
  }
}

// Returns the authorized project ref for `supabaseUrl`, or throws. Messages never echo
// the raw URL, so credentials embedded in a malformed value are not printed.
export function resolveAuthorizedTarget(supabaseUrl, expectedRef) {
  if (typeof supabaseUrl !== "string" || supabaseUrl.trim() === "") {
    throw new TargetGuardError("NEXT_PUBLIC_SUPABASE_URL is missing.");
  }
  let url;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new TargetGuardError("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new TargetGuardError("NEXT_PUBLIC_SUPABASE_URL must use https.");
  }
  if (url.username !== "" || url.password !== "") {
    throw new TargetGuardError("NEXT_PUBLIC_SUPABASE_URL must not contain credentials.");
  }
  if (url.port !== "" || (url.pathname !== "/" && url.pathname !== "") || url.search !== "" || url.hash !== "") {
    throw new TargetGuardError("NEXT_PUBLIC_SUPABASE_URL must be a bare project URL (no port, path, query or fragment).");
  }

  const match = SUPABASE_HOST_PATTERN.exec(url.hostname);
  if (!match) {
    throw new TargetGuardError(`host "${url.hostname}" is not a <project-ref>.supabase.co project host.`);
  }
  const projectRef = match[1];
  if (!AUTHORIZED_PROJECT_REFS.includes(projectRef)) {
    throw new TargetGuardError(`project "${projectRef}" is not on the authorized live-test allowlist.`);
  }
  if (expectedRef !== projectRef) {
    throw new TargetGuardError(`project "${projectRef}" does not match SECURITY_TEST_EXPECTED_PROJECT_REF.`);
  }
  return projectRef;
}
