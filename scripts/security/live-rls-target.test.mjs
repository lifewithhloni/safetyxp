// Isolated tests for the live-test target guard. Pure URL parsing only; no network.
// Run: node --test scripts/security/live-rls-target.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTHORIZED_PROJECT_REFS, TargetGuardError, resolveAuthorizedTarget } from "./live-rls-target.mjs";

const STAGING = "uyblrfweabzagxrpyvzr";
const STAGING_URL = `https://${STAGING}.supabase.co`;
// Stand-in for the Production project: any well-formed ref that is not on the allowlist.
const PRODUCTION = "prodprojectrefabcdef";

const rejects = (url, expectedRef, pattern) =>
  assert.throws(() => resolveAuthorizedTarget(url, expectedRef), (error) => error instanceof TargetGuardError && pattern.test(error.message));

test("the allowlist contains only the authorized Staging project", () => {
  assert.deepEqual([...AUTHORIZED_PROJECT_REFS], [STAGING]);
  assert.ok(Object.isFrozen(AUTHORIZED_PROJECT_REFS));
});

test("the exact authorized Staging URL is accepted", () => {
  assert.equal(resolveAuthorizedTarget(STAGING_URL, STAGING), STAGING);
  assert.equal(resolveAuthorizedTarget(`${STAGING_URL}/`, STAGING), STAGING);
  assert.equal(resolveAuthorizedTarget(`https://${STAGING.toUpperCase()}.SUPABASE.CO`, STAGING), STAGING, "hostnames are case-insensitive");
});

test("attacker-controlled hostname suffixes and lookalikes are rejected", () => {
  for (const url of [
    `https://${STAGING}.attacker.example`,
    `https://${STAGING}.supabase.co.attacker.example`,
    `https://${STAGING}.supabase.co.`,
    `https://${STAGING}-supabase.co`,
    `https://${STAGING}.supabase.com`,
    `https://evil.${STAGING}.supabase.co`,
    `https://${STAGING}.supabase.co@attacker.example`,
  ]) {
    assert.throws(() => resolveAuthorizedTarget(url, STAGING), TargetGuardError, url);
  }
});

test("a different Supabase project is rejected", () => {
  rejects("https://abcdefghijklmnopqrst.supabase.co", STAGING, /not on the authorized live-test allowlist/);
});

test("a Production reference is rejected even when the environment agrees with it", () => {
  rejects(`https://${PRODUCTION}.supabase.co`, PRODUCTION, /"prodprojectrefabcdef" is not on the authorized live-test allowlist/);
  rejects(`https://${PRODUCTION}.supabase.co`, STAGING, /not on the authorized live-test allowlist/);
});

test("misleading environment values cannot authorize a different host", () => {
  rejects(`https://${STAGING}.attacker.example`, STAGING, /not a <project-ref>\.supabase\.co project host/);
  rejects("https://abcdefghijklmnopqrst.supabase.co", "abcdefghijklmnopqrst", /not on the authorized live-test allowlist/);
  rejects("http://localhost:54321", "local", /must use https/);
  rejects("https://localhost", "local", /not a <project-ref>\.supabase\.co project host/);
  rejects("https://127.0.0.1", "local", /not a <project-ref>\.supabase\.co project host/);
  // The env var still has to agree with the allowlisted host; it can narrow, never widen.
  for (const expected of [undefined, "", "local", PRODUCTION, `${STAGING} `, STAGING.toUpperCase()]) {
    rejects(STAGING_URL, expected, /does not match SECURITY_TEST_EXPECTED_PROJECT_REF/);
  }
});

test("malformed, non-HTTPS and non-bare URLs are rejected", () => {
  for (const [url, pattern] of [
    [undefined, /missing/],
    ["", /missing/],
    ["   ", /missing/],
    ["not a url", /not a valid URL/],
    [`${STAGING}.supabase.co`, /not a valid URL/],
    [`http://${STAGING}.supabase.co`, /must use https/],
    [`ws://${STAGING}.supabase.co`, /must use https/],
    [`ftp://${STAGING}.supabase.co`, /must use https/],
    [`https://user:pass@${STAGING}.supabase.co`, /must not contain credentials/],
    [`https://${STAGING}.supabase.co:8443`, /bare project URL/],
    [`https://${STAGING}.supabase.co/rest/v1`, /bare project URL/],
    [`https://${STAGING}.supabase.co/?x=1`, /bare project URL/],
    [`https://${STAGING}.supabase.co/#x`, /bare project URL/],
  ]) {
    rejects(url, STAGING, pattern);
  }
});

test("rejection messages never echo embedded credentials", () => {
  try {
    resolveAuthorizedTarget(`https://svc:sb_secret_DO_NOT_PRINT@${STAGING}.supabase.co`, STAGING);
    assert.fail("expected rejection");
  } catch (error) {
    assert.ok(error instanceof TargetGuardError);
    assert.ok(!error.message.includes("sb_secret_DO_NOT_PRINT"));
    assert.ok(!error.message.includes("svc:"));
  }
});
