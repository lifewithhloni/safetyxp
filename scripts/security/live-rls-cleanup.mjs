import { readFileSync, statSync } from "node:fs";

// ---------------------------------------------------------------------------
// Cleanup for the live RLS penetration test, shared by the normal run and the
// --cleanup-manifest recovery path.
//
// The manifest is untrusted input: it only says WHERE to look. A remote
// resource is deleted only when server-side state independently proves it was
// created by this harness for this run (marker values, run-derived names,
// server-assigned creation time, database records linking storage paths to a
// verified company, and no linked rows that cannot be attributed to the run).
// Anything uncertain is skipped and reported. Table names, buckets and filters
// are fixed in this file and never read from the manifest.
// ---------------------------------------------------------------------------

export const MARKER = "SAFETYXP_SECURITY_TEST";
export const MANIFEST_VERSION = 1;
export const STORAGE_BUCKETS = Object.freeze(["policy-documents", "certificates"]);
export const COMPANY_LABELS = Object.freeze(["A", "B"]);
export const USER_LABELS = Object.freeze(["admin_a", "employee_a", "employee_a2", "admin_b", "employee_b"]);
export const MAX_MANIFEST_BYTES = 256 * 1024;

const MANIFEST_STATUSES = new Set(["in_progress", "kept", "cleaned", "cleanup_incomplete"]);
const MANIFEST_REQUIRED_KEYS = ["version", "marker", "runId", "targetProjectRef", "createdAt", "status", "companies", "users", "storage"];
const MANIFEST_OPTIONAL_KEYS = ["cleanup"];
const RUN_ID_PATTERN = /^(\d{13})-[0-9a-f]{8}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PROJECT_REF_PATTERN = /^(local|[a-z0-9]{20})$/;
const STORAGE_PATH_PATTERN =
  /^company\/([0-9a-f-]{36})\/(policy-documents|certificates)\/(\d{13}-[0-9a-f]{8})-([0-9a-f-]{36})\.pdf$/;
// Run id timestamp and manifest createdAt are taken back to back when the run starts.
const CREATED_AT_TOLERANCE_MS = 60 * 1000;
// Server-assigned created_at of run resources must fall in this window around the run start.
const CLOCK_SKEW_MS = 15 * 60 * 1000;
const MAX_RUN_DURATION_MS = 6 * 60 * 60 * 1000;
const LINKED_ROW_LIMIT = 500;

export const companyName = (runId, label) => `${MARKER}_${runId}_COMPANY_${label}`;
export const userEmail = (runId, label) => `${MARKER.toLowerCase()}_${runId}_${label}@example.test`;
export const storagePath = (bucket, companyId, runId, objectId) => `company/${companyId}/${bucket}/${runId}-${objectId}.pdf`;

// Each bucket maps to the table whose row (id = object id in the path) records the uploaded object.
// `employeeColumn` names a record column whose profile must also be a verified run profile of the object's company.
const STORAGE_RECORDS = {
  "policy-documents": { table: "policy_documents", owned: (row, runId) => startsWith(row.file_name, `${MARKER}-${runId}-`) },
  certificates: {
    table: "certificates",
    employeeColumn: "employee_id",
    owned: (row, runId) => startsWith(row.certificate_number, `${MARKER}-${runId}-CERT-`),
  },
};

export class ManifestError extends Error {
  constructor(problems) {
    super(`Manifest rejected: ${problems.join("; ")}`);
    this.name = "ManifestError";
    this.problems = problems;
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function startsWith(value, prefix) {
  return typeof value === "string" && value.startsWith(prefix);
}

function checkKeys(object, required, optional, label, problems) {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.hasOwn(object, key)) {
      problems.push(`${label}: missing "${key}"`);
    }
  }
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      problems.push(`${label}: unexpected field "${key}"`);
    }
  }
}

function checkUnique(values, label, problems) {
  if (new Set(values).size !== values.length) {
    problems.push(`${label}: duplicate entries`);
  }
}

export function readManifestFile(path) {
  const { size } = statSync(path);
  if (size > MAX_MANIFEST_BYTES) {
    throw new ManifestError([`file is ${size} bytes, larger than the ${MAX_MANIFEST_BYTES}-byte limit`]);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ManifestError(["file is not valid JSON (truncated or corrupted)"]);
  }
}

// Validates shape, version and internal consistency, and returns a normalized copy.
// Everything checked here is necessary but never sufficient for deletion.
export function validateManifest(manifest, targetProjectRef) {
  const problems = [];
  if (!isPlainObject(manifest)) {
    throw new ManifestError(["manifest is not a JSON object"]);
  }

  checkKeys(manifest, MANIFEST_REQUIRED_KEYS, MANIFEST_OPTIONAL_KEYS, "manifest", problems);
  if (manifest.version !== MANIFEST_VERSION) {
    problems.push(`unsupported version ${JSON.stringify(manifest.version)} (expected ${MANIFEST_VERSION})`);
  }
  if (manifest.marker !== MARKER) {
    problems.push("marker does not match");
  }
  const runMatch = typeof manifest.runId === "string" ? RUN_ID_PATTERN.exec(manifest.runId) : null;
  if (!runMatch) {
    problems.push("runId is malformed");
  }
  if (typeof manifest.targetProjectRef !== "string" || !PROJECT_REF_PATTERN.test(manifest.targetProjectRef)) {
    problems.push("targetProjectRef is malformed");
  } else if (manifest.targetProjectRef !== targetProjectRef) {
    problems.push(`belongs to project "${manifest.targetProjectRef}", not the guarded target "${targetProjectRef}"`);
  }
  if (!MANIFEST_STATUSES.has(manifest.status)) {
    problems.push("status is not an allowed value");
  }
  if (manifest.cleanup !== undefined && !isPlainObject(manifest.cleanup)) {
    problems.push("cleanup must be an object");
  }
  for (const key of ["companies", "users", "storage"]) {
    if (!Array.isArray(manifest[key])) {
      problems.push(`${key} must be an array`);
    }
  }
  const createdAtMs = typeof manifest.createdAt === "string" ? Date.parse(manifest.createdAt) : NaN;
  if (!Number.isFinite(createdAtMs) || new Date(createdAtMs).toISOString() !== manifest.createdAt) {
    problems.push("createdAt is not an ISO timestamp");
  } else if (runMatch && Math.abs(createdAtMs - Number(runMatch[1])) > CREATED_AT_TOLERANCE_MS) {
    problems.push("createdAt does not match the runId timestamp");
  }
  if (problems.length > 0) {
    throw new ManifestError(problems);
  }

  const runId = manifest.runId;
  const runStartedAt = Number(runMatch[1]);

  // Companies are created in a fixed order with run-derived names.
  if (manifest.companies.length > COMPANY_LABELS.length) {
    problems.push("companies: more entries than a run creates");
  }
  const companies = manifest.companies.slice(0, COMPANY_LABELS.length).map((entry, index) => {
    const label = `companies[${index}]`;
    if (!isPlainObject(entry)) {
      problems.push(`${label}: not an object`);
      return null;
    }
    checkKeys(entry, ["id", "name"], [], label, problems);
    if (typeof entry.id !== "string" || !UUID_PATTERN.test(entry.id)) {
      problems.push(`${label}: id is not a UUID`);
    }
    if (entry.name !== companyName(runId, COMPANY_LABELS[index])) {
      problems.push(`${label}: name does not match this run`);
    }
    return { id: entry.id, name: entry.name, label: COMPANY_LABELS[index] };
  });
  checkUnique(companies.map((company) => company?.id), "companies", problems);

  // Users are created in a fixed order after both companies; only the last may lack an id (crash mid-create).
  if (manifest.users.length > USER_LABELS.length) {
    problems.push("users: more entries than a run creates");
  }
  if (manifest.users.length > 0 && manifest.companies.length !== COMPANY_LABELS.length) {
    problems.push("users: present before both companies were recorded");
  }
  const users = manifest.users.slice(0, USER_LABELS.length).map((entry, index, all) => {
    const label = `users[${index}]`;
    if (!isPlainObject(entry)) {
      problems.push(`${label}: not an object`);
      return null;
    }
    checkKeys(entry, ["label", "email", "id"], [], label, problems);
    if (entry.label !== USER_LABELS[index]) {
      problems.push(`${label}: label does not match the run's creation order`);
    }
    if (entry.email !== userEmail(runId, USER_LABELS[index])) {
      problems.push(`${label}: email does not match this run`);
    }
    if (entry.id === null) {
      if (index !== all.length - 1) {
        problems.push(`${label}: only the last user may be missing an id`);
      }
    } else if (typeof entry.id !== "string" || !UUID_PATTERN.test(entry.id)) {
      problems.push(`${label}: id is not a UUID`);
    }
    return { label: USER_LABELS[index], email: userEmail(runId, USER_LABELS[index]), id: entry.id };
  });
  checkUnique(users.filter((user) => user?.id).map((user) => user.id), "users", problems);

  // Storage objects are uploaded only after all users and profiles exist.
  if (manifest.storage.length > 4) {
    problems.push("storage: more entries than a run creates");
  }
  if (manifest.storage.length > 0 && (users.length !== USER_LABELS.length || users.some((user) => !user?.id))) {
    problems.push("storage: present before all users were recorded");
  }
  const companyIds = new Set(companies.map((company) => company?.id));
  const storage = manifest.storage.slice(0, 4).map((entry, index) => {
    const label = `storage[${index}]`;
    if (!isPlainObject(entry)) {
      problems.push(`${label}: not an object`);
      return null;
    }
    checkKeys(entry, ["bucket", "path"], [], label, problems);
    if (!STORAGE_BUCKETS.includes(entry.bucket)) {
      problems.push(`${label}: bucket is not on the allowlist`);
      return null;
    }
    const match = typeof entry.path === "string" ? STORAGE_PATH_PATTERN.exec(entry.path) : null;
    if (!match) {
      problems.push(`${label}: path does not match the test-run structure`);
      return null;
    }
    const [, companyId, folder, pathRunId, objectId] = match;
    if (!UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(objectId)) {
      problems.push(`${label}: path contains a malformed UUID`);
    }
    if (folder !== entry.bucket) {
      problems.push(`${label}: path folder does not match bucket`);
    }
    if (pathRunId !== runId) {
      problems.push(`${label}: path belongs to a different run`);
    }
    if (!companyIds.has(companyId)) {
      problems.push(`${label}: path is not under one of this run's companies`);
    }
    if (entry.path !== storagePath(entry.bucket, companyId, runId, objectId)) {
      problems.push(`${label}: path is not in canonical form`);
    }
    return { bucket: entry.bucket, path: entry.path, companyId, objectId };
  });
  checkUnique(storage.map((object) => object?.path), "storage", problems);

  if (problems.length > 0) {
    throw new ManifestError(problems);
  }
  return { runId, runStartedAt, targetProjectRef, companies, users, storage };
}

// ---------------------------------------------------------------------------
// Independent ownership checks (read-only)
// ---------------------------------------------------------------------------

// Only the Auth admin API's own "user not found" response confirms absence; any other
// error (including one whose message happens to say "not found") stays an error.
function isUserNotFound(error) {
  return error?.name === "AuthApiError" && error.status === 404 && error.code === "user_not_found";
}

function withinRunWindow(timestamp, run) {
  const value = typeof timestamp === "string" ? Date.parse(timestamp) : NaN;
  return Number.isFinite(value) && value >= run.runStartedAt - CLOCK_SKEW_MS && value <= run.runStartedAt + MAX_RUN_DURATION_MS;
}

async function verifyCompany(adminClient, run, company) {
  const { data: row, error } = await adminClient.from("companies").select("id, name, industry, created_at").eq("id", company.id).maybeSingle();
  if (error) {
    return { state: "unverified", detail: error.message };
  }
  if (!row) {
    return { state: "absent" };
  }
  const problems = [];
  if (row.id !== company.id || row.name !== company.name) {
    problems.push("name does not match this run");
  }
  if (row.industry !== MARKER) {
    problems.push("marker missing");
  }
  if (!withinRunWindow(row.created_at, run)) {
    problems.push("created outside this run's time window");
  }
  return problems.length > 0 ? { state: "foreign", detail: problems.join(", ") } : { state: "owned" };
}

async function findUserByEmail(adminClient, email) {
  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Unable to list users: ${error.message}`);
    }
    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match || users.length < perPage) {
      return match ?? null;
    }
  }
  throw new Error("Unable to search users: too many pages.");
}

async function verifyUser(adminClient, run, entry) {
  let user;
  if (entry.id) {
    const { data, error } = await adminClient.auth.admin.getUserById(entry.id);
    if (error) {
      return isUserNotFound(error) ? { state: "absent" } : { state: "unverified", detail: error.message };
    }
    user = data?.user;
    if (!user) {
      return { state: "unverified", detail: "lookup returned neither a user nor an error" };
    }
  } else {
    try {
      user = await findUserByEmail(adminClient, entry.email);
    } catch (error) {
      return { state: "unverified", detail: error.message };
    }
  }
  if (!user) {
    return { state: "absent" };
  }

  const problems = [];
  if (entry.id && user.id !== entry.id) {
    problems.push("id mismatch");
  }
  if (user.email?.toLowerCase() !== entry.email) {
    problems.push("email does not match this run");
  }
  if (user.user_metadata?.marker !== MARKER || user.user_metadata?.run_id !== run.runId) {
    problems.push("run metadata missing or mismatched");
  }
  if (!withinRunWindow(user.created_at, run)) {
    problems.push("created outside this run's time window");
  }
  return problems.length > 0 ? { state: "foreign", id: user.id, detail: problems.join(", ") } : { state: "owned", id: user.id };
}

async function objectExists(adminClient, bucket, path) {
  const slash = path.lastIndexOf("/");
  const name = path.slice(slash + 1);
  const { data, error } = await adminClient.storage.from(bucket).list(path.slice(0, slash), { limit: 100, search: name });
  if (error) {
    return { error: error.message };
  }
  return { exists: (data ?? []).some((entry) => entry.name === name) };
}

async function verifyStorageRecord(adminClient, run, object, ownedUserIds) {
  const spec = STORAGE_RECORDS[object.bucket];
  const unmatched = (reason) => ({ state: "unverified", detail: `no matching ${spec.table} record for this run${reason ? ` (${reason})` : ""}` });
  const { data: row, error } = await adminClient.from(spec.table).select("*").eq("id", object.objectId).maybeSingle();
  if (error) {
    return { state: "unverified", detail: error.message };
  }
  if (!row || row.company_id !== object.companyId || row.storage_path !== object.path || !spec.owned(row, run.runId)) {
    return unmatched();
  }
  if (!spec.employeeColumn) {
    return { state: "owned" };
  }

  // Storage runs before linked-row inspection, so the employee's profile is checked directly here.
  // certificates.employee_id is NOT NULL (001); the harness always sets profiles.employee_number.
  const employeeId = row[spec.employeeColumn];
  if (typeof employeeId !== "string") {
    return unmatched("record has no employee");
  }
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, company_id, employee_number")
    .eq("id", employeeId)
    .maybeSingle();
  if (profileError) {
    return unmatched(`employee profile check failed: ${profileError.message}`);
  }
  if (!profile) {
    return unmatched("employee profile not found");
  }
  if (
    profile.id !== employeeId ||
    profile.company_id !== object.companyId ||
    !ownedUserIds.has(profile.id) ||
    !startsWith(profile.employee_number, `${MARKER}_${run.runId}_`)
  ) {
    return unmatched("employee is not a verified run profile of this company");
  }
  return { state: "owned" };
}

// Every relationship through which deleting a run company (and its profiles) would
// cascade to, null out, or be blocked by other rows, per supabase/migrations 001-013.
// Each row found must be attributable to this run; tables the run never seeds
// tolerate no rows at all. `collect` gathers ids for the next level of checks;
// `ownedIds` keeps only the rows that passed their ownership check.
const NEVER_SEEDED = () => false;
// The run seeds one mission per company, titled by company label (no run id in the title), for an
// employee of that company in that company's campaign; progress rows link that mission and employee.
const isRunMission = (row, ctx) =>
  row.title === `${MARKER} Mission ${ctx.companyLabel}` && ctx.ownedIds.campaign.has(row.campaign_id) && ctx.ownedIds.profile.has(row.employee_id);
const isRunMissionProgress = (row, ctx) => ctx.ownedIds.mission.has(row.mission_id) && ctx.ownedIds.profile.has(row.employee_id);
const LINKED_RESOURCES = [
  { scope: "company", table: "profiles", column: "company_id", collect: "profile",
    owned: (row, ctx) => ctx.ownedUserIds.has(row.id) && startsWith(row.employee_number, `${MARKER}_${ctx.runId}_`) },
  { scope: "company", table: "policies", column: "company_id", collect: "policy",
    owned: (row, ctx) => startsWith(row.title, `${MARKER} ${ctx.runId} POLICY `) },
  { scope: "company", table: "campaigns", column: "company_id", collect: "campaign",
    owned: (row, ctx) => startsWith(row.name, `${MARKER} ${ctx.runId} CAMPAIGN `) },
  { scope: "company", table: "policy_documents", column: "company_id", collect: "policyDocument",
    owned: (row, ctx) => startsWith(row.file_name, `${MARKER}-${ctx.runId}-`) },
  { scope: "company", table: "certificates", column: "company_id",
    owned: (row, ctx) => startsWith(row.certificate_number, `${MARKER}-${ctx.runId}-CERT-`) && ctx.ownedIds.profile.has(row.employee_id) },
  { scope: "company", table: "notifications", column: "company_id", collect: "notification",
    owned: (row, ctx) => startsWith(row.title, `${MARKER} ${ctx.runId} Notification `) && ctx.ownedUserIds.has(row.user_id) },
  ...[
    "departments", "achievements", "automation_rules", "generated_content", "audit_logs", "ai_generation_jobs",
    "ai_usage_records", "employee_invitations", "employee_import_batches",
    "employee_import_errors", "quiz_answers", "scenario_answers",
  ].map((table) => ({ scope: "company", table, column: "company_id", owned: NEVER_SEEDED })),
  { scope: "company", table: "notification_deliveries", column: "company_id",
    owned: (row, ctx) => ctx.ownedIds.notification.has(row.notification_id) },

  { scope: "policy", table: "policy_documents", column: "policy_id",
    owned: (row, ctx) => row.company_id === ctx.companyId && startsWith(row.file_name, `${MARKER}-${ctx.runId}-`) },
  { scope: "policy", table: "campaigns", column: "policy_id",
    owned: (row, ctx) => row.company_id === ctx.companyId && startsWith(row.name, `${MARKER} ${ctx.runId} CAMPAIGN `) },
  ...["generated_content", "ai_generation_jobs", "ai_usage_records"]
    .map((table) => ({ scope: "policy", table, column: "policy_id", owned: NEVER_SEEDED })),
  { scope: "policyDocument", table: "ai_generation_jobs", column: "policy_document_id", owned: NEVER_SEEDED },

  { scope: "campaign", table: "campaign_participants", column: "campaign_id",
    owned: (row, ctx) => ctx.ownedIds.campaign.has(row.campaign_id) && ctx.ownedIds.profile.has(row.employee_id) },
  { scope: "campaign", table: "daily_missions", column: "campaign_id", collect: "mission", owned: isRunMission },
  { scope: "campaign", table: "certificates", column: "campaign_id",
    owned: (row, ctx) =>
      row.company_id === ctx.companyId && startsWith(row.certificate_number, `${MARKER}-${ctx.runId}-CERT-`) && ctx.ownedIds.profile.has(row.employee_id) },
  ...[
    "learning_modules", "quiz_questions", "scenarios", "flashcards", "generated_content", "ai_generation_jobs",
    "quiz_answers", "scenario_answers",
  ].map((table) => ({ scope: "campaign", table, column: "campaign_id", owned: NEVER_SEEDED })),

  { scope: "profile", table: "campaign_participants", column: "employee_id",
    owned: (row, ctx) => ctx.ownedIds.campaign.has(row.campaign_id) },
  { scope: "profile", table: "daily_missions", column: "employee_id", collect: "mission", owned: isRunMission },
  { scope: "profile", table: "certificates", column: "employee_id",
    owned: (row, ctx) =>
      row.company_id === ctx.companyId && startsWith(row.certificate_number, `${MARKER}-${ctx.runId}-CERT-`) && ctx.ownedIds.profile.has(row.employee_id) },
  { scope: "profile", table: "notifications", column: "user_id", collect: "notification",
    owned: (row, ctx) => row.company_id === ctx.companyId && startsWith(row.title, `${MARKER} ${ctx.runId} Notification `) },
  { scope: "profile", table: "employee_xp", column: "employee_id",
    owned: (row, ctx) => ctx.ownedUserIds.has(row.employee_id) },
  ...[
    ["notification_preferences", "user_id"], ["employee_achievements", "employee_id"], ["ai_generation_jobs", "created_by"],
    ["ai_usage_records", "user_id"], ["employee_invitations", "employee_id"], ["employee_invitations", "invited_by"],
    ["employee_import_batches", "created_by"], ["quiz_answers", "employee_id"], ["scenario_answers", "employee_id"],
    ["audit_logs", "user_id"], ["content_reviews", "reviewer_id"],
  ].map(([table, column]) => ({ scope: "profile", table, column, owned: NEVER_SEEDED })),

  // Last, so missions and notifications found through both companies/campaigns and profiles are included.
  { scope: "notification", table: "notification_deliveries", column: "notification_id",
    owned: (row, ctx) => row.company_id === ctx.companyId && ctx.ownedIds.notification.has(row.notification_id) },
  { scope: "mission", table: "mission_progress", column: "mission_id", owned: isRunMissionProgress },
  { scope: "profile", table: "mission_progress", column: "employee_id", owned: isRunMissionProgress },
  ...["quiz_answers", "scenario_answers"].map((table) => ({ scope: "mission", table, column: "mission_id", owned: NEVER_SEEDED })),
];

async function inspectLinkedResources(adminClient, run, company, ownedUserIds) {
  const companyId = company.id;
  const ctx = {
    runId: run.runId,
    companyId,
    companyLabel: company.label,
    ownedUserIds,
    ids: { company: [companyId], profile: [], policy: [], policyDocument: [], campaign: [], mission: [], notification: [] },
    ownedIds: { profile: new Set(), policy: new Set(), policyDocument: new Set(), campaign: new Set(), mission: new Set(), notification: new Set() },
  };
  const problems = [];
  for (const spec of LINKED_RESOURCES) {
    const ids = ctx.ids[spec.scope];
    if (ids.length === 0) {
      continue;
    }
    const { data, error } = await adminClient.from(spec.table).select("*").in(spec.column, ids).limit(LINKED_ROW_LIMIT + 1);
    if (error) {
      problems.push(`${spec.table}.${spec.column} could not be inspected (${error.message})`);
      continue;
    }
    const rows = data ?? [];
    if (rows.length > LINKED_ROW_LIMIT) {
      problems.push(`${spec.table}.${spec.column} has too many linked rows to verify`);
      continue;
    }
    let foreign = 0;
    for (const row of rows) {
      const owned = spec.owned(row, ctx);
      if (!owned) {
        foreign += 1;
      }
      if (spec.collect) {
        if (!ctx.ids[spec.collect].includes(row.id)) {
          ctx.ids[spec.collect].push(row.id);
        }
        if (owned) {
          ctx.ownedIds[spec.collect].add(row.id);
        }
      }
    }
    if (foreign > 0) {
      problems.push(`${spec.table}.${spec.column} has ${foreign} row(s) not attributable to this run`);
    }
  }
  return problems;
}

// Auth-user references declared without ON DELETE (NO ACTION), which would block deletion.
const AUTH_USER_REFERENCES = [
  { table: "policies", column: "created_by" },
  { table: "campaigns", column: "created_by" },
  { table: "generated_content", column: "created_by" },
];

async function findAuthUserReferences(adminClient, userId) {
  const problems = [];
  for (const { table, column } of AUTH_USER_REFERENCES) {
    const { data, error } = await adminClient.from(table).select("id").eq(column, userId).limit(1);
    if (error) {
      problems.push(`${table}.${column} could not be checked (${error.message})`);
    } else if ((data ?? []).length > 0) {
      problems.push(`still referenced by ${table}.${column}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

function emptyResult() {
  return { status: "clean", deleted: [], absent: [], skipped: [], failures: [], verification: [] };
}

export async function cleanupRun(adminClient, manifest, { targetProjectRef }) {
  const result = emptyResult();
  let run;
  try {
    run = validateManifest(manifest, targetProjectRef);
  } catch (error) {
    // Nothing is touched when the manifest itself cannot be trusted.
    result.status = "incomplete";
    result.failures.push(error.message);
    return result;
  }

  const skip = (label, reason) => result.skipped.push(`${label}: ${reason}`);
  const fail = (label, reason) => result.failures.push(`${label}: ${reason}`);

  // 1. Read-only: establish which companies and users really belong to this run.
  const companyStates = new Map();
  for (const company of run.companies) {
    companyStates.set(company.id, await verifyCompany(adminClient, run, company));
  }
  const ownedUserIds = new Set();
  for (const entry of run.users) {
    const label = `auth user ${entry.email}`;
    const verified = await verifyUser(adminClient, run, entry);
    if (verified.state === "owned") {
      ownedUserIds.add(verified.id);
    } else if (verified.state === "absent") {
      result.absent.push(label);
    } else if (verified.state === "foreign") {
      skip(label, `ownership not proven (${verified.detail})`);
    } else {
      skip(label, `ownership could not be verified (${verified.detail})`);
    }
  }

  // 2. Storage objects: only under a verified run company and backed by that company's run record.
  const resolvedObjects = new Set();
  const removedObjects = [];
  for (const object of run.storage) {
    const label = `storage ${object.bucket}/${object.path}`;
    const company = companyStates.get(object.companyId);
    const record = company.state === "owned" ? await verifyStorageRecord(adminClient, run, object, ownedUserIds) : null;
    if (record?.state !== "owned") {
      const reason = record ? record.detail : `owning company is ${company.state}`;
      const existing = await objectExists(adminClient, object.bucket, object.path);
      if (existing.error) {
        skip(label, `ownership not proven (${reason}) and existence check failed (${existing.error})`);
      } else if (!existing.exists) {
        result.absent.push(label);
        resolvedObjects.add(object.path);
      } else {
        skip(label, `ownership not proven (${reason})`);
      }
      continue;
    }
    const { data, error } = await adminClient.storage.from(object.bucket).remove([object.path]);
    if (error) {
      fail(label, error.message);
    } else if ((data ?? []).length === 0) {
      result.absent.push(label);
      resolvedObjects.add(object.path);
    } else {
      result.deleted.push(label);
      resolvedObjects.add(object.path);
      removedObjects.push(object);
    }
  }

  // 3. Companies (cascades to their rows): only verified, with storage resolved and every linked row attributable.
  const deletedCompanyIds = [];
  for (const company of run.companies) {
    const label = `company ${company.name}`;
    const state = companyStates.get(company.id);
    if (state.state === "absent") {
      result.absent.push(label);
      continue;
    }
    if (state.state !== "owned") {
      skip(label, state.state === "foreign" ? `ownership not proven (${state.detail})` : `ownership could not be verified (${state.detail})`);
      continue;
    }
    if (run.storage.some((object) => object.companyId === company.id && !resolvedObjects.has(object.path))) {
      skip(label, "its storage objects were not all removed");
      continue;
    }
    const problems = await inspectLinkedResources(adminClient, run, company, ownedUserIds);
    if (problems.length > 0) {
      skip(label, `linked data not attributable to this run: ${problems.join("; ")}`);
      continue;
    }
    const { data: deleted, error } = await adminClient
      .from("companies")
      .delete()
      .eq("id", company.id)
      .eq("name", company.name)
      .eq("industry", MARKER)
      .select("id");
    if (error) {
      fail(label, error.message);
    } else if ((deleted ?? []).length === 1) {
      result.deleted.push(label);
      deletedCompanyIds.push(company.id);
    } else {
      fail(label, `delete affected ${(deleted ?? []).length} rows`);
    }
  }

  // 4. Auth users: only verified, only once no profile remains (deleting one would cascade),
  //    and only when nothing still references them (those rows are never removed to force it).
  const deletedUserIds = [];
  for (const userId of ownedUserIds) {
    const label = `auth user ${userId}`;
    const { data: profile, error: profileError } = await adminClient.from("profiles").select("id, company_id").eq("id", userId).maybeSingle();
    if (profileError) {
      skip(label, `profile check failed (${profileError.message})`);
      continue;
    }
    if (profile) {
      skip(label, `profile still exists in company ${profile.company_id}`);
      continue;
    }
    const references = await findAuthUserReferences(adminClient, userId);
    if (references.length > 0) {
      skip(label, references.join("; "));
      continue;
    }
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      fail(label, error.message);
    } else {
      result.deleted.push(label);
      deletedUserIds.push(userId);
    }
  }

  // 5. Verify that everything reported as deleted is really gone.
  for (const object of removedObjects) {
    const resource = `storage ${object.bucket}/${object.path}`;
    const existing = await objectExists(adminClient, object.bucket, object.path);
    if (existing.error) {
      fail(resource, `could not verify removal (${existing.error})`);
    } else {
      result.verification.push({ resource, gone: !existing.exists });
    }
  }
  if (deletedCompanyIds.length > 0) {
    const { data, error } = await adminClient.from("companies").select("id").in("id", deletedCompanyIds);
    if (error) {
      fail("verify companies", error.message);
    } else {
      for (const id of deletedCompanyIds) {
        result.verification.push({ resource: `company ${id}`, gone: !(data ?? []).some((row) => row.id === id) });
      }
    }
  }
  for (const userId of deletedUserIds) {
    const { error } = await adminClient.auth.admin.getUserById(userId);
    if (error && !isUserNotFound(error)) {
      fail(`auth user ${userId}`, `could not verify removal (${error.message})`);
    } else {
      result.verification.push({ resource: `auth user ${userId}`, gone: isUserNotFound(error) });
    }
  }
  for (const check of result.verification.filter((entry) => !entry.gone)) {
    fail(check.resource, "still present after cleanup");
  }

  if (result.failures.length > 0 || result.skipped.length > 0) {
    result.status = "incomplete";
  }
  return result;
}
