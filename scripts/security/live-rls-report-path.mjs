import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Where the live RLS test writes its JSON report. SECURITY_TEST_REPORT_PATH may
// only choose a .json file inside the repository's docs/ directory; it has no
// effect on the Supabase target or any other safety check.
// ---------------------------------------------------------------------------

export const DEFAULT_REPORT_PATH = "docs/security-live-rls-results.json";

const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class ReportPathError extends Error {
  constructor(message) {
    super(`SECURITY_TEST_REPORT_PATH rejected: ${message}`);
    this.name = "ReportPathError";
  }
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

// Returns the report path to write (relative to `root`, "/"-separated), or throws.
// Checked before any network request, so a bad value never costs a run its report.
export function resolveReportPath(value, root = process.cwd()) {
  if (value === undefined || value === "") {
    return DEFAULT_REPORT_PATH;
  }
  if (typeof value !== "string" || value.trim() !== value) {
    throw new ReportPathError("must be a plain relative path without surrounding whitespace.");
  }
  if (isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.startsWith("/") || value.startsWith("\\")) {
    throw new ReportPathError("must be relative to the repository, not absolute.");
  }

  const segments = value.split(/[\\/]/);
  if (segments.some((segment) => segment === "..")) {
    throw new ReportPathError("must not contain '..'.");
  }
  if (segments[0] !== "docs" || segments.length < 2) {
    throw new ReportPathError("must be inside the docs/ directory.");
  }
  if (segments.some((segment) => !SEGMENT_PATTERN.test(segment))) {
    throw new ReportPathError("segments may only contain letters, digits, '.', '_' and '-', and must not be empty or start with '.'.");
  }
  if (!/^.+\.json$/.test(segments.at(-1))) {
    throw new ReportPathError("must name a .json file.");
  }

  // Lexical containment, then the same check on real paths so symlinks cannot escape docs/.
  const docsDir = resolve(root, "docs");
  const target = resolve(root, ...segments);
  if (!isInside(docsDir, target)) {
    throw new ReportPathError("must be inside the docs/ directory.");
  }
  const parent = resolve(target, "..");
  if (!existsSync(parent) || !lstatSync(parent).isDirectory()) {
    throw new ReportPathError("its directory must already exist inside docs/.");
  }
  const realDocs = realpathSync(docsDir);
  const realParent = realpathSync(parent);
  if (realParent !== realDocs && !isInside(realDocs, realParent)) {
    throw new ReportPathError("its directory resolves outside docs/.");
  }
  if (existsSync(target) && !lstatSync(target).isFile()) {
    throw new ReportPathError("an existing entry at that path is not a regular file.");
  }
  return segments.join("/");
}
