import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  MARKER,
  MANIFEST_VERSION,
  STORAGE_BUCKETS as REQUIRED_BUCKETS,
  cleanupRun,
  companyName,
  readManifestFile,
  storagePath,
  userEmail,
  validateManifest,
} from "./live-rls-cleanup.mjs";
import { resolveReportPath } from "./live-rls-report-path.mjs";
import { resolveAuthorizedTarget } from "./live-rls-target.mjs";

const RUN_ID = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const NOW = new Date();
const DATE_ONLY = NOW.toISOString().slice(0, 10);
const TEST_FILE_TYPE = "application/pdf";
const TEST_FILE_BYTES = "%PDF-1.4\n%";
// 42501: RLS / privilege violation. P0001: exception raised by prevent_profile_security_field_changes.
const DENIAL_ERROR_CODES = new Set(["42501", "P0001"]);
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

let abortRequested = false;
let activeManifestPath = null;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function ensureSafeEnvironment() {
  const allowed = (process.env.SECURITY_TEST_ALLOW ?? "").toLowerCase() === "true";
  const environment = (process.env.SECURITY_TEST_ENV ?? "").toLowerCase();

  if (!allowed) {
    throw new Error("SECURITY_TEST_ALLOW=true is required to run live penetration tests.");
  }

  if (!["local", "dev", "development", "staging", "test"].includes(environment)) {
    throw new Error("SECURITY_TEST_ENV must be one of: local, dev, development, staging, test.");
  }
}

function ensureExpectedTarget(supabaseUrl) {
  // The in-code allowlist authorizes the target; the env var must also agree with it.
  return resolveAuthorizedTarget(supabaseUrl, requireEnv("SECURITY_TEST_EXPECTED_PROJECT_REF"));
}

function readKeys() {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }

  return { publishableKey, serviceRoleKey };
}

function generatePassword() {
  // Never logged or persisted; only used to sign in the run's own test users.
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

function installAbortHandlers() {
  let signals = 0;
  const onSignal = (signal) => {
    signals += 1;
    if (signals === 1) {
      abortRequested = true;
      console.error(`${signal} received: stopping after the current request, then cleaning up. Signal again to exit without cleanup.`);
      return;
    }
    console.error(
      `Exiting without cleanup.${activeManifestPath ? ` Remove leftovers with: --cleanup-manifest "${activeManifestPath}"` : ""}`
    );
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

function checkpoint() {
  if (abortRequested) {
    throw new Error("Run aborted by signal before completion.");
  }
}

// ---------------------------------------------------------------------------
// Run manifest: records every remote resource before (or as) it is created,
// so cleanup knows where to look and a crashed run can be cleaned up later.
// Ownership is re-proven from server-side state at cleanup (live-rls-cleanup.mjs).
// Contains identifiers only - never keys, passwords or tokens.
// ---------------------------------------------------------------------------

function createManifest(targetProjectRef) {
  const directory = process.env.SECURITY_TEST_MANIFEST_DIR ?? join(tmpdir(), "safetyxp-security-test-runs");
  mkdirSync(directory, { recursive: true });
  const manifest = {
    path: join(directory, `${RUN_ID}.json`),
    data: {
      version: MANIFEST_VERSION,
      marker: MARKER,
      runId: RUN_ID,
      targetProjectRef,
      createdAt: NOW.toISOString(),
      status: "in_progress",
      companies: [],
      users: [],
      storage: [],
    },
  };
  saveManifest(manifest);
  return manifest;
}

function saveManifest(manifest) {
  writeFileSync(manifest.path, JSON.stringify(manifest.data, null, 2));
}

async function verifyRequiredBuckets(adminClient) {
  const { data: buckets, error } = await adminClient.storage.listBuckets();
  if (error) {
    throw new Error(`Unable to list storage buckets: ${error.message}`);
  }

  const problems = [];
  for (const name of REQUIRED_BUCKETS) {
    const bucket = (buckets ?? []).find((candidate) => candidate.name === name);
    if (!bucket) {
      problems.push(`${name}: missing`);
      continue;
    }
    const allowedTypes = bucket.allowed_mime_types ?? [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(TEST_FILE_TYPE) && !allowedTypes.includes("application/*")) {
      problems.push(`${name}: does not accept ${TEST_FILE_TYPE}`);
    }
    if (bucket.file_size_limit && bucket.file_size_limit < TEST_FILE_BYTES.length) {
      problems.push(`${name}: file size limit too small`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Required storage buckets are not ready; no test data was created (${problems.join("; ")}).`);
  }
}

async function createCompany(adminClient, manifest, label) {
  checkpoint();
  const id = randomUUID();
  const name = companyName(RUN_ID, label);
  manifest.data.companies.push({ id, name });
  saveManifest(manifest);

  const { error } = await adminClient.from("companies").insert({
    id,
    name,
    industry: MARKER,
    logo_url: null,
    timezone: "UTC",
  });
  if (error) {
    throw new Error(`Unable to create company ${label}: ${error.message}`);
  }
  return id;
}

async function createTestUser(adminClient, manifest, password, label) {
  checkpoint();
  const email = userEmail(RUN_ID, label);
  const entry = { label, email, id: null };
  manifest.data.users.push(entry);
  saveManifest(manifest);

  // Create-only: an existing account with this email is never reused, reset or deleted.
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { marker: MARKER, run_id: RUN_ID },
  });
  if (error || !data?.user) {
    throw new Error(`Unable to create test user ${label}: ${error?.message ?? "unknown"}`);
  }

  entry.id = data.user.id;
  saveManifest(manifest);
  return { id: data.user.id, email };
}

async function createProfile(adminClient, profile) {
  checkpoint();
  const { error } = await adminClient.from("profiles").insert({
    id: profile.id,
    company_id: profile.company_id,
    email: profile.email,
    first_name: "SAFETYXP",
    last_name: profile.last_name,
    role: profile.role,
    job_title: `${MARKER} ${profile.role}`,
    department_id: null,
    employee_number: `${MARKER}_${RUN_ID}_${profile.last_name}`,
    avatar_url: null,
  });

  if (error) {
    throw new Error(`Unable to create profile ${profile.last_name}: ${error.message}`);
  }
}

async function insertRows(adminClient, table, rows, label) {
  checkpoint();
  const { error } = await adminClient.from(table).insert(rows);
  if (error) {
    throw new Error(`Unable to seed ${label}: ${error.message}`);
  }
}

async function uploadTestObject(adminClient, manifest, bucket, path) {
  checkpoint();
  manifest.data.storage.push({ bucket, path });
  saveManifest(manifest);

  const { error } = await adminClient.storage
    .from(bucket)
    .upload(path, new Blob([TEST_FILE_BYTES], { type: TEST_FILE_TYPE }), { contentType: TEST_FILE_TYPE, upsert: false });
  if (error) {
    throw new Error(`Unable to upload test object to ${bucket}: ${error.message}`);
  }

  // Existence proof: a later "denied" signed URL then cannot be explained by a missing object.
  const { error: signError } = await adminClient.storage.from(bucket).createSignedUrl(path, 60);
  if (signError) {
    throw new Error(`Uploaded test object in ${bucket} is not retrievable by the service role: ${signError.message}`);
  }
}

async function seedData(adminClient, manifest, ids) {
  const policyAId = randomUUID();
  const policyBId = randomUUID();
  const campaignAId = randomUUID();
  const campaignBId = randomUUID();
  const missionAId = randomUUID();
  const missionBId = randomUUID();
  const documentAId = randomUUID();
  const documentBId = randomUUID();
  const certificateAId = randomUUID();
  const certificateBId = randomUUID();

  const policyDocumentAPath = storagePath("policy-documents", ids.companyA, RUN_ID, documentAId);
  const policyDocumentBPath = storagePath("policy-documents", ids.companyB, RUN_ID, documentBId);
  const certificateAPath = storagePath("certificates", ids.companyA, RUN_ID, certificateAId);
  const certificateBPath = storagePath("certificates", ids.companyB, RUN_ID, certificateBId);

  await insertRows(adminClient, "policies", [
    { id: policyAId, company_id: ids.companyA, title: `${MARKER} ${RUN_ID} POLICY A`, description: MARKER, status: "active", created_by: ids.adminA },
    { id: policyBId, company_id: ids.companyB, title: `${MARKER} ${RUN_ID} POLICY B`, description: MARKER, status: "active", created_by: ids.adminB },
  ], "policies");

  await insertRows(adminClient, "campaigns", [
    {
      id: campaignAId,
      company_id: ids.companyA,
      policy_id: policyAId,
      name: `${MARKER} ${RUN_ID} CAMPAIGN A`,
      description: MARKER,
      official_deadline: `${DATE_ONLY}T23:59:59Z`,
      learning_deadline: `${DATE_ONLY}T23:59:59Z`,
      buffer_days: 0,
      status: "active",
      created_by: ids.adminA,
    },
    {
      id: campaignBId,
      company_id: ids.companyB,
      policy_id: policyBId,
      name: `${MARKER} ${RUN_ID} CAMPAIGN B`,
      description: MARKER,
      official_deadline: `${DATE_ONLY}T23:59:59Z`,
      learning_deadline: `${DATE_ONLY}T23:59:59Z`,
      buffer_days: 0,
      status: "active",
      created_by: ids.adminB,
    },
  ], "campaigns");

  await insertRows(adminClient, "policy_documents", [
    {
      id: documentAId,
      policy_id: policyAId,
      company_id: ids.companyA,
      file_name: `${MARKER}-${RUN_ID}-A.pdf`,
      storage_path: policyDocumentAPath,
      file_type: TEST_FILE_TYPE,
      file_size: TEST_FILE_BYTES.length,
      page_count: 1,
      extracted_text: MARKER,
      processing_status: "completed",
    },
    {
      id: documentBId,
      policy_id: policyBId,
      company_id: ids.companyB,
      file_name: `${MARKER}-${RUN_ID}-B.pdf`,
      storage_path: policyDocumentBPath,
      file_type: TEST_FILE_TYPE,
      file_size: TEST_FILE_BYTES.length,
      page_count: 1,
      extracted_text: MARKER,
      processing_status: "completed",
    },
  ], "policy documents");

  await insertRows(adminClient, "daily_missions", [
    {
      id: missionAId,
      campaign_id: campaignAId,
      employee_id: ids.employeeA,
      module_id: null,
      scheduled_date: DATE_ONLY,
      type: "quiz",
      title: `${MARKER} Mission A`,
      description: MARKER,
      estimated_minutes: 10,
      order_index: 1,
      status: "scheduled",
      xp_reward: 10,
    },
    {
      id: missionBId,
      campaign_id: campaignBId,
      employee_id: ids.employeeB,
      module_id: null,
      scheduled_date: DATE_ONLY,
      type: "quiz",
      title: `${MARKER} Mission B`,
      description: MARKER,
      estimated_minutes: 10,
      order_index: 1,
      status: "scheduled",
      xp_reward: 10,
    },
  ], "missions");

  await insertRows(adminClient, "mission_progress", [
    { mission_id: missionAId, employee_id: ids.employeeA, status: "scheduled", score: null },
    { mission_id: missionBId, employee_id: ids.employeeB, status: "scheduled", score: null },
  ], "mission progress");

  await insertRows(adminClient, "certificates", [
    {
      id: certificateAId,
      company_id: ids.companyA,
      employee_id: ids.employeeA,
      campaign_id: campaignAId,
      certificate_number: `${MARKER}-${RUN_ID}-CERT-A`,
      issued_at: NOW.toISOString(),
      expires_at: new Date(NOW.getTime() + 86400000).toISOString(),
      status: "issued",
      verification_code: `${MARKER}-${RUN_ID}-VERIFY-A`,
      storage_path: certificateAPath,
    },
    {
      id: certificateBId,
      company_id: ids.companyB,
      employee_id: ids.employeeB,
      campaign_id: campaignBId,
      certificate_number: `${MARKER}-${RUN_ID}-CERT-B`,
      issued_at: NOW.toISOString(),
      expires_at: new Date(NOW.getTime() + 86400000).toISOString(),
      status: "issued",
      verification_code: `${MARKER}-${RUN_ID}-VERIFY-B`,
      storage_path: certificateBPath,
    },
  ], "certificates");

  await insertRows(adminClient, "notifications", [
    {
      company_id: ids.companyA,
      user_id: ids.employeeA,
      type: "DailyMissionAvailable",
      title: `${MARKER} ${RUN_ID} Notification A`,
      message: MARKER,
      priority: "normal",
      channel: "IN_APP",
      status: "pending",
    },
    {
      company_id: ids.companyB,
      user_id: ids.employeeB,
      type: "DailyMissionAvailable",
      title: `${MARKER} ${RUN_ID} Notification B`,
      message: MARKER,
      priority: "normal",
      channel: "IN_APP",
      status: "pending",
    },
  ], "notifications");

  await insertRows(adminClient, "employee_xp", [
    { employee_id: ids.employeeA, total_xp: 50, current_level: 1 },
    { employee_id: ids.employeeB, total_xp: 70, current_level: 1 },
  ], "employee XP");

  await insertRows(adminClient, "campaign_participants", [
    { campaign_id: campaignAId, employee_id: ids.employeeA2 },
    { campaign_id: campaignBId, employee_id: ids.employeeB },
  ], "campaign participants");

  await uploadTestObject(adminClient, manifest, "policy-documents", policyDocumentAPath);
  await uploadTestObject(adminClient, manifest, "policy-documents", policyDocumentBPath);
  await uploadTestObject(adminClient, manifest, "certificates", certificateAPath);
  await uploadTestObject(adminClient, manifest, "certificates", certificateBPath);

  return {
    policyAId,
    policyBId,
    campaignAId,
    campaignBId,
    missionAId,
    missionBId,
    documentAId,
    documentBId,
    certificateAId,
    certificateBId,
    certificateAPath,
    certificateBPath,
    policyDocumentAPath,
    policyDocumentBPath,
  };
}

// ---------------------------------------------------------------------------
// Result classification. Only expected denial errors count as "denied"; any
// other error is a failure, so outages or schema errors cannot pass a test.
// ---------------------------------------------------------------------------

function createReport(targetProjectRef) {
  return {
    generatedAt: new Date().toISOString(),
    marker: MARKER,
    runId: RUN_ID,
    targetProjectRef,
    manifestPath: null,
    status: "running",
    phase: "init",
    error: null,
    checks: [],
    reverse: [],
    idor: [],
    participants: [],
    storage: [],
    observations: [],
    passed: 0,
    failed: 0,
    cleanup: null,
  };
}

function appendResult(report, collection, name, passed, detail) {
  report[collection].push({ name, passed, detail });
  if (passed) {
    report.passed += 1;
  } else {
    report.failed += 1;
  }
}

function describeError(error) {
  return `${error.code ?? "no-code"}: ${error.message}`;
}

function readOutcome(result) {
  if (result.error) {
    return { kind: "error", rows: [], detail: `unexpected error ${describeError(result.error)}` };
  }
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  return { kind: rows.length > 0 ? "visible" : "empty", rows, detail: `${rows.length} row(s) visible` };
}

function writeOutcome(result) {
  if (result.error) {
    return DENIAL_ERROR_CODES.has(result.error.code)
      ? { kind: "denied", detail: `denied ${describeError(result.error)}` }
      : { kind: "error", detail: `unexpected error ${describeError(result.error)}` };
  }
  const rows = result.data ?? [];
  return rows.length > 0
    ? { kind: "written", detail: `${rows.length} row(s) written` }
    : { kind: "denied", detail: "0 rows affected (filtered by RLS)" };
}

function rowSnapshot(adminClient, table, filters) {
  return async () => {
    let query = adminClient.from(table).select("*");
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Unable to snapshot ${table}: ${error.message}`);
    }
    return data;
  };
}

function combinedSnapshot(...snapshots) {
  return async () => Promise.all(snapshots.map((snapshot) => snapshot()));
}

async function expectVisible(report, collection, name, query) {
  checkpoint();
  const outcome = readOutcome(await query());
  appendResult(report, collection, name, outcome.kind === "visible", outcome.detail);
  return outcome;
}

async function expectHidden(report, collection, name, query) {
  checkpoint();
  const outcome = readOutcome(await query());
  const detail = outcome.kind === "visible" ? `LEAK: ${outcome.detail}` : outcome.kind === "error" ? outcome.detail : "hidden by RLS";
  appendResult(report, collection, name, outcome.kind === "empty", detail);
}

async function expectDeniedWrite(report, collection, name, attempt, snapshot) {
  checkpoint();
  const before = await snapshot();
  const outcome = writeOutcome(await attempt());
  const after = await snapshot();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  appendResult(
    report,
    collection,
    name,
    outcome.kind === "denied" && unchanged,
    unchanged ? outcome.detail : `${outcome.detail}; DATA CHANGED`
  );
}

// Denied update/delete: "0 rows affected" only proves a denial if the exact target row existed beforehand.
async function expectDeniedChange(report, collection, name, attempt, target, snapshot = target) {
  checkpoint();
  if (!(await target())) {
    appendResult(report, collection, name, false, "target row missing before attempt; denial not evaluated");
    return;
  }
  await expectDeniedWrite(report, collection, name, attempt, snapshot);
}

async function expectSignedUrl(report, name, client, bucket, path) {
  checkpoint();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60);
  appendResult(report, "storage", name, !error && Boolean(data?.signedUrl), error ? `unexpected error: ${error.message}` : "signed URL issued");
}

async function expectSignedUrlDenied(report, name, client, bucket, path) {
  checkpoint();
  // The object's existence was proven with the service role during setup, so an error here is an access denial.
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60);
  appendResult(report, "storage", name, Boolean(error) && !data?.signedUrl, error ? `denied: ${error.message}` : "LEAK: signed URL issued");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runForwardMatrix({ employeeA, adminA }, ids, report, adminClient) {
  const c = "checks";
  const profileA = rowSnapshot(adminClient, "profiles", { id: ids.employeeA });
  const profileB = rowSnapshot(adminClient, "profiles", { id: ids.employeeB });
  const profileAdminA = rowSnapshot(adminClient, "profiles", { id: ids.adminA });

  await expectVisible(report, c, "TEST 1 Employee A reads own Company A mission", () =>
    employeeA.from("daily_missions").select("id").eq("id", ids.missionAId).maybeSingle());
  await expectHidden(report, c, "TEST 2 Employee A cannot read Company B mission", () =>
    employeeA.from("daily_missions").select("id").eq("id", ids.missionBId).maybeSingle());
  await expectVisible(report, c, "TEST 3 Admin A reads Company A profiles", () =>
    adminA.from("profiles").select("id").eq("company_id", ids.companyA).limit(1));
  await expectHidden(report, c, "TEST 4 Admin A cannot read Company B profiles", () =>
    adminA.from("profiles").select("id").eq("company_id", ids.companyB).limit(1));
  await expectVisible(report, c, "TEST 5a Employee A reads own company policy", () =>
    employeeA.from("policies").select("id").eq("id", ids.policyAId).maybeSingle());
  await expectHidden(report, c, "TEST 5 Employee A cannot read Company B policy", () =>
    employeeA.from("policies").select("id").eq("id", ids.policyBId).maybeSingle());
  await expectVisible(report, c, "TEST 6a Employee A reads own certificate", () =>
    employeeA.from("certificates").select("id").eq("id", ids.certificateAId).maybeSingle());
  await expectHidden(report, c, "TEST 6 Employee A cannot read Company B certificate", () =>
    employeeA.from("certificates").select("id").eq("id", ids.certificateBId).maybeSingle());
  await expectVisible(report, c, "TEST 6b Employee A reads own company policy document", () =>
    employeeA.from("policy_documents").select("id").eq("id", ids.documentAId).maybeSingle());
  await expectHidden(report, c, "TEST 7 Admin A cannot read Company B campaign", () =>
    adminA.from("campaigns").select("id").eq("id", ids.campaignBId).maybeSingle());
  await expectVisible(report, c, "TEST 8 Admin A reads Company A campaign", () =>
    adminA.from("campaigns").select("id").eq("id", ids.campaignAId).maybeSingle());

  checkpoint();
  const newTitle = `${MARKER} ${RUN_ID} updated by employee`;
  const t9 = writeOutcome(await employeeA.from("profiles").update({ job_title: newTitle }).eq("id", ids.employeeA).select("id"));
  const t9Stored = await profileA();
  appendResult(report, c, "TEST 9 Employee A updates allowed profile field", t9.kind === "written" && t9Stored?.job_title === newTitle, t9.detail);

  await expectDeniedChange(report, c, "TEST 10 Employee A cannot change own company_id",
    () => employeeA.from("profiles").update({ company_id: ids.companyB }).eq("id", ids.employeeA).select("id"), profileA);
  await expectDeniedChange(report, c, "TEST 11 Employee A cannot change own role",
    () => employeeA.from("profiles").update({ role: "admin" }).eq("id", ids.employeeA).select("id"), profileA);
  await expectDeniedChange(report, c, "TEST 12 Employee A cannot change own profile id",
    () => employeeA.from("profiles").update({ id: randomUUID() }).eq("id", ids.employeeA).select("id"), profileA);
  await expectDeniedChange(report, c, "TEST 13 Employee A cannot modify Employee B profile",
    () => employeeA.from("profiles").update({ job_title: "Unauthorized cross-company update" }).eq("id", ids.employeeB).select("id"), profileB);
  await expectDeniedChange(report, c, "TEST 14 Admin A cannot change own role",
    () => adminA.from("profiles").update({ role: "super_admin" }).eq("id", ids.adminA).select("id"), profileAdminA);
  await expectDeniedChange(report, c, "TEST 15 Admin A cannot change own company_id",
    () => adminA.from("profiles").update({ company_id: ids.companyB }).eq("id", ids.adminA).select("id"), profileAdminA);
  await expectDeniedChange(report, c, "TEST 16 Admin A cannot change own profile id",
    () => adminA.from("profiles").update({ id: randomUUID() }).eq("id", ids.adminA).select("id"), profileAdminA);
  await expectDeniedChange(report, c, "TEST 19 Employee A cannot modify own XP",
    () => employeeA.from("employee_xp").update({ total_xp: 99999 }).eq("employee_id", ids.employeeA).select("employee_id"),
    rowSnapshot(adminClient, "employee_xp", { employee_id: ids.employeeA }));
  await expectDeniedChange(report, c, "TEST 20 Employee A cannot fake mission completion",
    () => employeeA.from("mission_progress").update({ status: "completed" }).eq("mission_id", ids.missionAId).eq("employee_id", ids.employeeA).select("mission_id"),
    rowSnapshot(adminClient, "mission_progress", { mission_id: ids.missionAId, employee_id: ids.employeeA }));

  await expectVisible(report, c, "TEST 21a Employee A reads own notifications", () =>
    employeeA.from("notifications").select("id").eq("company_id", ids.companyA).limit(1));
  await expectHidden(report, c, "TEST 21 Employee A cannot read Company B notifications", () =>
    employeeA.from("notifications").select("id").eq("company_id", ids.companyB).limit(1));
}

async function runReverseMatrix({ employeeB, adminB }, ids, report, adminClient) {
  const c = "reverse";
  const participantA2 = rowSnapshot(adminClient, "campaign_participants", { campaign_id: ids.campaignAId, employee_id: ids.employeeA2 });

  await expectVisible(report, c, "REV 1 Employee B reads own Company B mission", () =>
    employeeB.from("daily_missions").select("id").eq("id", ids.missionBId).maybeSingle());
  await expectHidden(report, c, "REV 2 Employee B cannot read Company A mission", () =>
    employeeB.from("daily_missions").select("id").eq("id", ids.missionAId).maybeSingle());
  await expectVisible(report, c, "REV 3 Admin B reads Company B profiles", () =>
    adminB.from("profiles").select("id").eq("company_id", ids.companyB).limit(1));
  await expectHidden(report, c, "REV 4 Admin B cannot read Company A profiles", () =>
    adminB.from("profiles").select("id").eq("company_id", ids.companyA).limit(1));
  await expectHidden(report, c, "REV 5 Employee B cannot read Company A policy", () =>
    employeeB.from("policies").select("id").eq("id", ids.policyAId).maybeSingle());
  await expectHidden(report, c, "REV 6 Employee B cannot read Company A certificate", () =>
    employeeB.from("certificates").select("id").eq("id", ids.certificateAId).maybeSingle());
  await expectHidden(report, c, "REV 7 Employee B cannot read Company A policy document", () =>
    employeeB.from("policy_documents").select("id").eq("id", ids.documentAId).maybeSingle());
  await expectHidden(report, c, "REV 8 Employee B cannot read Company A notifications", () =>
    employeeB.from("notifications").select("id").eq("company_id", ids.companyA).limit(1));
  await expectVisible(report, c, "REV 9 Admin B reads Company B campaign", () =>
    adminB.from("campaigns").select("id").eq("id", ids.campaignBId).maybeSingle());
  await expectHidden(report, c, "REV 10 Admin B cannot read Company A campaign", () =>
    adminB.from("campaigns").select("id").eq("id", ids.campaignAId).maybeSingle());
  await expectHidden(report, c, "REV 11 Admin B cannot read Company A notifications", () =>
    adminB.from("notifications").select("id").eq("company_id", ids.companyA).limit(1));

  const profileA = rowSnapshot(adminClient, "profiles", { id: ids.employeeA });
  await expectDeniedChange(report, c, "REV 12 Admin B cannot modify Employee A profile",
    () => adminB.from("profiles").update({ job_title: "Unauthorized cross-company update" }).eq("id", ids.employeeA).select("id"), profileA);
  await expectDeniedChange(report, c, "REV 13 Admin B cannot change Employee A role",
    () => adminB.from("profiles").update({ role: "admin" }).eq("id", ids.employeeA).select("id"), profileA);
  await expectDeniedChange(report, c, "REV 14 Employee B cannot modify Employee A profile",
    () => employeeB.from("profiles").update({ job_title: "Unauthorized cross-company update" }).eq("id", ids.employeeA).select("id"), profileA);
  await expectDeniedChange(report, c, "REV 15 Admin B cannot modify Employee A XP",
    () => adminB.from("employee_xp").update({ total_xp: 99999 }).eq("employee_id", ids.employeeA).select("employee_id"),
    rowSnapshot(adminClient, "employee_xp", { employee_id: ids.employeeA }));
  await expectDeniedChange(report, c, "REV 16 Admin B cannot modify Company A mission progress",
    () => adminB.from("mission_progress").update({ status: "completed" }).eq("mission_id", ids.missionAId).eq("employee_id", ids.employeeA).select("mission_id"),
    rowSnapshot(adminClient, "mission_progress", { mission_id: ids.missionAId, employee_id: ids.employeeA }));

  await expectHidden(report, c, "REV 17 Admin B cannot read Company A campaign participants", () =>
    adminB.from("campaign_participants").select("id").eq("campaign_id", ids.campaignAId));
  await expectDeniedWrite(report, c, "REV 18 Admin B cannot assign Company B employee to Company A campaign",
    () => adminB.from("campaign_participants").insert({ campaign_id: ids.campaignAId, employee_id: ids.employeeB }).select("id"),
    rowSnapshot(adminClient, "campaign_participants", { campaign_id: ids.campaignAId, employee_id: ids.employeeB }));
  await expectDeniedWrite(report, c, "REV 19 Admin B cannot assign Company A employee to Company B campaign",
    () => adminB.from("campaign_participants").insert({ campaign_id: ids.campaignBId, employee_id: ids.employeeA }).select("id"),
    rowSnapshot(adminClient, "campaign_participants", { campaign_id: ids.campaignBId, employee_id: ids.employeeA }));
  await expectDeniedChange(report, c, "REV 20 Admin B cannot alter Company A assignment",
    () => adminB.from("campaign_participants").update({ status: "completed", completion_percentage: 100 })
      .eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA2).select("id"),
    participantA2);
  await expectDeniedChange(report, c, "REV 21 Admin B cannot delete Company A assignment",
    () => adminB.from("campaign_participants").delete().eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA2).select("id"),
    participantA2);
}

async function runIdorTests({ employeeA }, ids, report) {
  const probes = [
    ["IDOR employee id", () => employeeA.from("profiles").select("id").eq("id", ids.employeeB).maybeSingle()],
    ["IDOR campaign id", () => employeeA.from("campaigns").select("id").eq("id", ids.campaignBId).maybeSingle()],
    ["IDOR policy id", () => employeeA.from("policies").select("id").eq("id", ids.policyBId).maybeSingle()],
    ["IDOR certificate id", () => employeeA.from("certificates").select("id").eq("id", ids.certificateBId).maybeSingle()],
    ["IDOR document id", () => employeeA.from("policy_documents").select("id").eq("id", ids.documentBId).maybeSingle()],
    ["IDOR mission id", () => employeeA.from("daily_missions").select("id").eq("id", ids.missionBId).maybeSingle()],
  ];

  for (const [name, query] of probes) {
    await expectHidden(report, "idor", name, query);
  }
}

async function runCampaignParticipantTests({ employeeA, adminA }, ids, report, adminClient) {
  const c = "participants";
  const participant = (campaignId, employeeId) =>
    rowSnapshot(adminClient, "campaign_participants", { campaign_id: campaignId, employee_id: employeeId });
  const ownRow = participant(ids.campaignAId, ids.employeeA);

  // Employee checks run first so the denied self-assignment cannot be masked by the unique constraint.
  await expectDeniedWrite(report, c, "PART 1 Employee A cannot self-assign to Company A campaign",
    () => employeeA.from("campaign_participants").insert({ campaign_id: ids.campaignAId, employee_id: ids.employeeA }).select("id"),
    ownRow);

  checkpoint();
  const p2 = writeOutcome(await adminA.from("campaign_participants").insert({ campaign_id: ids.campaignAId, employee_id: ids.employeeA }).select("id"));
  appendResult(report, c, "PART 2 Admin A assigns Company A employee to Company A campaign",
    p2.kind === "written" && Boolean(await ownRow()), p2.detail);

  await expectDeniedWrite(report, c, "PART 3 Admin A cannot assign Company B employee to Company A campaign",
    () => adminA.from("campaign_participants").insert({ campaign_id: ids.campaignAId, employee_id: ids.employeeB }).select("id"),
    participant(ids.campaignAId, ids.employeeB));
  await expectDeniedWrite(report, c, "PART 4 Admin A cannot assign Company A employee to Company B campaign",
    () => adminA.from("campaign_participants").insert({ campaign_id: ids.campaignBId, employee_id: ids.employeeA }).select("id"),
    participant(ids.campaignBId, ids.employeeA));
  await expectDeniedWrite(report, c, "PART 5 Admin A cannot assign a non-employee profile",
    () => adminA.from("campaign_participants").insert({ campaign_id: ids.campaignAId, employee_id: ids.adminA }).select("id"),
    participant(ids.campaignAId, ids.adminA));
  await expectDeniedChange(report, c, "PART 6 Employee A cannot alter own assignment",
    () => employeeA.from("campaign_participants").update({ status: "completed", completion_percentage: 100, completed_at: NOW.toISOString() })
      .eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA).select("id"),
    ownRow);
  await expectDeniedChange(report, c, "PART 7 Employee A cannot delete own assignment",
    () => employeeA.from("campaign_participants").delete().eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA).select("id"),
    ownRow);
  await expectDeniedChange(report, c, "PART 8 Employee A cannot alter colleague assignment",
    () => employeeA.from("campaign_participants").update({ status: "completed", completion_percentage: 100 })
      .eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA2).select("id"),
    participant(ids.campaignAId, ids.employeeA2));

  const p9 = await expectVisible(report, c, "PART 9a Admin A reads Company A campaign participants", () =>
    adminA.from("campaign_participants").select("employee_id").eq("campaign_id", ids.campaignAId));
  const visibleIds = p9.rows.map((row) => row.employee_id);
  appendResult(report, c, "PART 9b Admin A sees both Company A assignments",
    visibleIds.includes(ids.employeeA) && visibleIds.includes(ids.employeeA2), `${visibleIds.length} assignment(s) visible`);

  await expectHidden(report, c, "PART 10 Admin A cannot read Company B campaign participants", () =>
    adminA.from("campaign_participants").select("id").eq("campaign_id", ids.campaignBId));
  await expectHidden(report, c, "PART 11 Admin A cannot read Company B employee assignments", () =>
    adminA.from("campaign_participants").select("id").eq("employee_id", ids.employeeB));

  const foreignRow = participant(ids.campaignBId, ids.employeeB);
  await expectDeniedChange(report, c, "PART 12 Admin A cannot alter Company B assignment",
    () => adminA.from("campaign_participants").update({ status: "completed", completion_percentage: 100 })
      .eq("campaign_id", ids.campaignBId).eq("employee_id", ids.employeeB).select("id"),
    foreignRow);
  await expectDeniedChange(report, c, "PART 13 Admin A cannot delete Company B assignment",
    () => adminA.from("campaign_participants").delete().eq("campaign_id", ids.campaignBId).eq("employee_id", ids.employeeB).select("id"),
    foreignRow);
  await expectDeniedChange(report, c, "PART 14 Admin A cannot re-point assignment to Company B employee",
    () => adminA.from("campaign_participants").update({ employee_id: ids.employeeB })
      .eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA).select("id"),
    ownRow,
    combinedSnapshot(ownRow, participant(ids.campaignAId, ids.employeeB)));
  await expectDeniedChange(report, c, "PART 15 Admin A cannot move assignment to Company B campaign",
    () => adminA.from("campaign_participants").update({ campaign_id: ids.campaignBId })
      .eq("campaign_id", ids.campaignAId).eq("employee_id", ids.employeeA).select("id"),
    ownRow,
    combinedSnapshot(ownRow, participant(ids.campaignBId, ids.employeeA)));

  // Informational only: migration 013 lets any same-company user read all campaign participant rows.
  checkpoint();
  const o1 = readOutcome(await employeeA.from("campaign_participants").select("employee_id").eq("campaign_id", ids.campaignAId));
  const colleagueRows = o1.rows.filter((row) => row.employee_id !== ids.employeeA).length;
  report.observations.push({
    name: "OBS 1 Employee A visibility of colleague assignments in Company A campaign",
    colleagueRowsVisible: colleagueRows,
    detail: o1.kind === "error" ? o1.detail : `${colleagueRows} colleague row(s) visible`,
  });
}

async function runStorageTests({ employeeA, adminA, employeeB, adminB }, ids, report) {
  await expectSignedUrl(report, "STORE 1 Employee A downloads own certificate", employeeA, "certificates", ids.certificateAPath);
  await expectSignedUrl(report, "STORE 2 Employee A downloads own company policy document", employeeA, "policy-documents", ids.policyDocumentAPath);
  await expectSignedUrlDenied(report, "STORE 3 Employee A cannot download Company B certificate", employeeA, "certificates", ids.certificateBPath);
  await expectSignedUrlDenied(report, "STORE 4 Admin A cannot download Company B certificate", adminA, "certificates", ids.certificateBPath);
  await expectSignedUrlDenied(report, "STORE 5 Employee A cannot download Company B policy document", employeeA, "policy-documents", ids.policyDocumentBPath);
  await expectSignedUrlDenied(report, "STORE 6 Admin A cannot download Company B policy document", adminA, "policy-documents", ids.policyDocumentBPath);
  await expectSignedUrl(report, "STORE 7 Employee B downloads own certificate", employeeB, "certificates", ids.certificateBPath);
  await expectSignedUrlDenied(report, "STORE 8 Employee B cannot download Company A certificate", employeeB, "certificates", ids.certificateAPath);
  await expectSignedUrlDenied(report, "STORE 9 Admin B cannot download Company A certificate", adminB, "certificates", ids.certificateAPath);
  await expectSignedUrlDenied(report, "STORE 10 Admin B cannot download Company A policy document", adminB, "policy-documents", ids.policyDocumentAPath);
}

async function runRoleChangeTest({ adminA }, ids, report, adminClient) {
  // Runs last: it temporarily promotes Employee A, so no later test can be affected.
  checkpoint();
  const profileA = rowSnapshot(adminClient, "profiles", { id: ids.employeeA });
  const t17 = writeOutcome(await adminA.from("profiles").update({ role: "admin" }).eq("id", ids.employeeA).select("id"));
  const promoted = await profileA();
  appendResult(report, "checks", "TEST 17 Company admin updates managed employee role", t17.kind === "written" && promoted?.role === "admin", t17.detail);

  const { error } = await adminClient.from("profiles").update({ role: "employee" }).eq("id", ids.employeeA);
  const restored = await profileA();
  if (error || restored?.role !== "employee") {
    throw new Error(`Could not restore Employee A role after TEST 17: ${error?.message ?? `role is ${restored?.role}`}`);
  }
}

async function signIn(supabaseUrl, publishableKey, email, password, label) {
  checkpoint();
  const client = createClient(supabaseUrl, publishableKey, CLIENT_OPTIONS);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`${label} sign-in failed: ${error.message}`);
  }
  return client;
}

async function runSuite({ adminClient, manifest, report, supabaseUrl, publishableKey, password }) {
  report.phase = "create_companies";
  const companyA = await createCompany(adminClient, manifest, "A");
  const companyB = await createCompany(adminClient, manifest, "B");

  report.phase = "create_users";
  const adminA = await createTestUser(adminClient, manifest, password, "admin_a");
  const employeeA = await createTestUser(adminClient, manifest, password, "employee_a");
  const employeeA2 = await createTestUser(adminClient, manifest, password, "employee_a2");
  const adminB = await createTestUser(adminClient, manifest, password, "admin_b");
  const employeeB = await createTestUser(adminClient, manifest, password, "employee_b");

  report.phase = "create_profiles";
  await createProfile(adminClient, { id: adminA.id, company_id: companyA, email: adminA.email, last_name: "ADMIN_A", role: "admin" });
  await createProfile(adminClient, { id: employeeA.id, company_id: companyA, email: employeeA.email, last_name: "EMPLOYEE_A", role: "employee" });
  await createProfile(adminClient, { id: employeeA2.id, company_id: companyA, email: employeeA2.email, last_name: "EMPLOYEE_A2", role: "employee" });
  await createProfile(adminClient, { id: adminB.id, company_id: companyB, email: adminB.email, last_name: "ADMIN_B", role: "admin" });
  await createProfile(adminClient, { id: employeeB.id, company_id: companyB, email: employeeB.email, last_name: "EMPLOYEE_B", role: "employee" });

  const people = {
    companyA,
    companyB,
    adminA: adminA.id,
    employeeA: employeeA.id,
    employeeA2: employeeA2.id,
    adminB: adminB.id,
    employeeB: employeeB.id,
  };

  report.phase = "seed";
  const ids = { ...people, ...(await seedData(adminClient, manifest, people)) };

  report.phase = "sign_in";
  const clients = {
    employeeA: await signIn(supabaseUrl, publishableKey, employeeA.email, password, "Employee A"),
    adminA: await signIn(supabaseUrl, publishableKey, adminA.email, password, "Admin A"),
    employeeB: await signIn(supabaseUrl, publishableKey, employeeB.email, password, "Employee B"),
    adminB: await signIn(supabaseUrl, publishableKey, adminB.email, password, "Admin B"),
  };

  report.phase = "tests_forward";
  await runForwardMatrix(clients, ids, report, adminClient);
  report.phase = "tests_reverse";
  await runReverseMatrix(clients, ids, report, adminClient);
  report.phase = "tests_idor";
  await runIdorTests(clients, ids, report);
  report.phase = "tests_participants";
  await runCampaignParticipantTests(clients, ids, report, adminClient);
  report.phase = "tests_storage";
  await runStorageTests(clients, ids, report);
  report.phase = "tests_role_change";
  await runRoleChangeTest(clients, ids, report, adminClient);
  report.phase = "completed";
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function parseCleanupManifestArg() {
  const index = process.argv.indexOf("--cleanup-manifest");
  if (index === -1) {
    return null;
  }
  const path = process.argv[index + 1];
  if (!path) {
    throw new Error("--cleanup-manifest requires a manifest file path.");
  }
  return path;
}

function printCleanup(cleanup) {
  console.log(`Cleanup: ${cleanup.status}${cleanup.reason ? ` (${cleanup.reason})` : ""}`);
  for (const entry of cleanup.absent ?? []) {
    console.log(`  ABSENT ${entry}`);
  }
  for (const entry of cleanup.skipped ?? []) {
    console.log(`  SKIPPED ${entry}`);
  }
  for (const entry of cleanup.failures ?? []) {
    console.log(`  FAILED ${entry}`);
  }
}

async function runManifestCleanup(adminClient, manifestPath, targetProjectRef) {
  // Rejects malformed, edited or foreign-project manifests before any remote request.
  const manifest = readManifestFile(manifestPath);
  validateManifest(manifest, targetProjectRef);

  const cleanup = await cleanupRun(adminClient, manifest, { targetProjectRef });
  manifest.status = cleanup.status === "clean" ? "cleaned" : "cleanup_incomplete";
  manifest.cleanup = cleanup;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  printCleanup(cleanup);
  if (cleanup.status !== "clean") {
    process.exitCode = 1;
  }
}

async function main() {
  const cleanupManifestPath = parseCleanupManifestArg();
  ensureSafeEnvironment();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const targetProjectRef = ensureExpectedTarget(supabaseUrl);
  console.log(`Target Supabase project: ${targetProjectRef} (${process.env.SECURITY_TEST_ENV})`);
  // Validated before any request; defaults to docs/security-live-rls-results.json.
  const reportPath = resolveReportPath(process.env.SECURITY_TEST_REPORT_PATH);

  const { publishableKey, serviceRoleKey } = readKeys();
  const adminClient = createClient(supabaseUrl, serviceRoleKey, CLIENT_OPTIONS);

  if (cleanupManifestPath) {
    await runManifestCleanup(adminClient, cleanupManifestPath, targetProjectRef);
    return;
  }

  const keepData = (process.env.SECURITY_TEST_KEEP_DATA ?? "").toLowerCase() === "true";
  const password = process.env.SECURITY_TEST_PASSWORD || generatePassword();
  const report = createReport(targetProjectRef);
  let manifest = null;
  installAbortHandlers();

  try {
    report.phase = "preflight";
    await verifyRequiredBuckets(adminClient);
    manifest = createManifest(targetProjectRef);
    report.manifestPath = manifest.path;
    activeManifestPath = manifest.path;
    console.log(`Run ${RUN_ID}; manifest: ${manifest.path}`);

    await runSuite({ adminClient, manifest, report, supabaseUrl, publishableKey, password });
    report.status = "completed";
  } catch (error) {
    report.status = abortRequested ? "aborted" : report.phase.startsWith("tests_") ? "tests_incomplete" : "setup_failed";
    report.error = error.message;
  } finally {
    if (!manifest) {
      report.cleanup = { status: "not_needed", reason: "no test resources were created" };
    } else if (keepData) {
      report.cleanup = { status: "skipped", reason: "SECURITY_TEST_KEEP_DATA=true; remove later with --cleanup-manifest" };
      manifest.data.status = "kept";
      saveManifest(manifest);
    } else {
      try {
        report.cleanup = await cleanupRun(adminClient, manifest.data, { targetProjectRef });
      } catch (error) {
        report.cleanup = { status: "incomplete", deleted: [], absent: [], skipped: [], failures: [`cleanup aborted: ${error.message}`], verification: [] };
      }
      manifest.data.status = report.cleanup.status === "clean" ? "cleaned" : "cleanup_incomplete";
      saveManifest(manifest);
    }

    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Run status: ${report.status}${report.error ? ` (${report.error})` : ""}`);
    console.log(`Live RLS checks: ${report.passed} passed, ${report.failed} failed.`);
    const results = [...report.checks, ...report.reverse, ...report.idor, ...report.participants, ...report.storage];
    for (const result of results.filter((entry) => !entry.passed)) {
      console.log(`FAILED ${result.name}: ${result.detail}`);
    }
    for (const observation of report.observations) {
      console.log(`${observation.name}: ${observation.detail}`);
    }
    printCleanup(report.cleanup);
    console.log(`Report written to ${reportPath}`);

    const cleanupOk = ["clean", "not_needed", "skipped"].includes(report.cleanup.status);
    if (report.status !== "completed" || report.failed > 0 || !cleanupOk) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
