// Isolated tests for SECURITY_TEST_REPORT_PATH validation. Uses a throwaway repo root
// under the OS temp directory; never touches the real docs/ or any network.
// Run: node --test scripts/security/live-rls-report-path.test.mjs
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_REPORT_PATH, ReportPathError, resolveReportPath } from "./live-rls-report-path.mjs";

function fakeRepo() {
  const root = mkdtempSync(join(tmpdir(), "safetyxp-report-path-"));
  mkdirSync(join(root, "docs", "security-runs"), { recursive: true });
  mkdirSync(join(root, "outside"));
  writeFileSync(join(root, "docs", "security-live-rls-results.json"), "{}");
  return root;
}

const rejects = (value, root, pattern) =>
  assert.throws(() => resolveReportPath(value, root), (error) => error instanceof ReportPathError && pattern.test(error.message), String(value));

test("the default report path is unchanged when the variable is unset or empty", () => {
  const root = fakeRepo();
  assert.equal(DEFAULT_REPORT_PATH, "docs/security-live-rls-results.json");
  assert.equal(resolveReportPath(undefined, root), DEFAULT_REPORT_PATH);
  assert.equal(resolveReportPath("", root), DEFAULT_REPORT_PATH);
});

test("safe relative paths inside docs/ are accepted", () => {
  const root = fakeRepo();
  assert.equal(resolveReportPath("docs/security-live-rls-results-staging-run2.json", root), "docs/security-live-rls-results-staging-run2.json");
  assert.equal(resolveReportPath("docs/security-runs/2026-10-16.json", root), "docs/security-runs/2026-10-16.json");
  assert.equal(resolveReportPath("docs\\security-runs\\run_3.json", root), "docs/security-runs/run_3.json", "Windows separators are normalized");
  assert.equal(resolveReportPath("docs/security-live-rls-results.json", root), "docs/security-live-rls-results.json");
});

test("absolute paths are rejected", () => {
  const root = fakeRepo();
  for (const value of [
    join(root, "docs", "x.json"),
    "/etc/x.json",
    "/docs/x.json",
    "\\docs\\x.json",
    "C:\\Users\\User\\x.json",
    "C:docs\\x.json",
    "\\\\server\\share\\docs\\x.json",
  ]) {
    rejects(value, root, /not absolute/);
  }
});

test("traversal is rejected, including traversal that would land back in docs/", () => {
  const root = fakeRepo();
  for (const value of ["docs/../x.json", "docs/../../x.json", "docs/security-runs/../../outside/x.json", "docs\\..\\x.json", "../docs/x.json", "docs/../docs/x.json"]) {
    rejects(value, root, /must not contain '\.\.'/);
  }
});

test("paths outside docs/ are rejected", () => {
  const root = fakeRepo();
  for (const value of ["x.json", "outside/x.json", "documents/x.json", "docs", "docs/", "Docs/x.json", "src/docs/x.json"]) {
    assert.throws(() => resolveReportPath(value, root), ReportPathError, value);
  }
  rejects("outside/x.json", root, /inside the docs\/ directory/);
});

test("unsafe segments, non-JSON targets and odd input are rejected", () => {
  const root = fakeRepo();
  for (const [value, pattern] of [
    ["docs/./x.json", /segments may only contain/],
    ["docs//x.json", /segments may only contain/],
    ["docs/.hidden.json", /segments may only contain/],
    ["docs/x.json:stream", /segments may only contain/],
    ["docs/x y.json", /segments may only contain/],
    ["docs/x.json\u0000", /segments may only contain/],
    ["docs/security-final-report-phase7j.md", /must name a \.json file/],
    ["docs/x.json.bak", /must name a \.json file/],
    [" docs/x.json", /without surrounding whitespace/],
    ["docs/missing-dir/x.json", /directory must already exist/],
  ]) {
    rejects(value, root, pattern);
  }
  assert.throws(() => resolveReportPath(42, root), ReportPathError);
});

test("an existing directory at the target path is rejected", () => {
  const root = fakeRepo();
  mkdirSync(join(root, "docs", "taken.json"));
  rejects("docs/taken.json", root, /not a regular file/);
});

test("a docs/ subdirectory that links outside docs/ is rejected", (t) => {
  const root = fakeRepo();
  mkdirSync(join(root, "outside", "nested"));
  try {
    symlinkSync(join(root, "outside"), join(root, "docs", "escape"), "junction");
  } catch (error) {
    t.skip(`cannot create a directory link here: ${error.code}`);
    return;
  }
  // The link as the immediate parent is refused outright (it is not a plain directory)...
  rejects("docs/escape/x.json", root, /directory must already exist inside docs\//);
  // ...and a real directory reached through the link is caught by the real-path check.
  rejects("docs/escape/nested/x.json", root, /resolves outside docs\//);
});
