// Isolated tests for live RLS test cleanup. Uses an in-memory fake of the Supabase
// admin client only; never touches a live project. Run: node --test scripts/security/
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  MARKER,
  ManifestError,
  cleanupRun,
  companyName,
  readManifestFile,
  storagePath,
  userEmail,
  validateManifest,
} from "./live-rls-cleanup.mjs";

const PROJECT = "uyblrfweabzagxrpyvzr";
const RUN_START = Date.parse("2026-10-12T18:25:30.293Z");
const RUN_ID = `${RUN_START}-f180e652`;
const at = (offsetMs) => new Date(RUN_START + offsetMs).toISOString();

// ---------------------------------------------------------------------------
// Fake Supabase admin client
// ---------------------------------------------------------------------------

// Shape of @supabase/auth-js AuthApiError for GET /admin/users/:id on a missing user.
const USER_NOT_FOUND = Object.freeze({ name: "AuthApiError", status: 404, code: "user_not_found", message: "User not found" });

function createFakeAdmin({ tables = {}, users = [], objects = [] } = {}) {
  const state = {
    tables: structuredClone(tables),
    users: new Map(users.map((user) => [user.id, structuredClone(user)])),
    objects: new Set(objects),
    calls: [],
    tableErrors: new Map(),
    // "table.column" -> message: fails only queries filtering on that column.
    columnErrors: new Map(),
    removeErrors: new Set(),
    // getUserById overrides: user id -> error object, or null for "no user and no error".
    userErrors: new Map(),
    // getUserById result for users deleted during the run (undefined = genuine not-found).
    userErrorAfterDelete: undefined,
    deletedUserIds: new Set(),
  };
  const rows = (table) => (state.tables[table] ??= []);

  class Query {
    constructor(table) {
      this.table = table;
      this.op = null;
      this.filters = [];
      this.columns = [];
      this.max = Infinity;
    }
    select() {
      this.op ??= "select";
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(column, value) {
      this.columns.push(column);
      this.filters.push((row) => row[column] === value);
      return this;
    }
    in(column, values) {
      this.columns.push(column);
      this.filters.push((row) => values.includes(row[column]));
      return this;
    }
    limit(count) {
      this.max = count;
      return this;
    }
    run() {
      state.calls.push({ kind: this.op === "delete" ? "delete" : "select", table: this.table });
      const error = state.tableErrors.get(this.table) ??
        this.columns.map((column) => state.columnErrors.get(`${this.table}.${column}`)).find(Boolean);
      if (error) {
        return { data: null, error: { message: error } };
      }
      const matched = rows(this.table).filter((row) => this.filters.every((filter) => filter(row)));
      if (this.op === "delete") {
        state.tables[this.table] = rows(this.table).filter((row) => !matched.includes(row));
        if (this.table === "companies") {
          // Mirrors ON DELETE CASCADE from companies for every company-scoped table.
          for (const company of matched) {
            for (const name of Object.keys(state.tables)) {
              state.tables[name] = state.tables[name].filter((row) => row.company_id !== company.id);
            }
          }
        }
      }
      return { data: structuredClone(matched.slice(0, this.max)), error: null };
    }
    maybeSingle() {
      const { data, error } = this.run();
      return Promise.resolve({ data: data?.[0] ?? null, error });
    }
    then(resolve, reject) {
      return Promise.resolve(this.run()).then(resolve, reject);
    }
  }

  const client = {
    from: (table) => new Query(table),
    auth: {
      admin: {
        async getUserById(id) {
          state.calls.push({ kind: "getUser", id });
          const injected = state.deletedUserIds.has(id) ? state.userErrorAfterDelete : state.userErrors.get(id);
          if (injected === null) {
            return { data: { user: null }, error: null };
          }
          if (injected) {
            return { data: { user: null }, error: injected };
          }
          const user = state.users.get(id);
          return user ? { data: { user: structuredClone(user) }, error: null } : { data: { user: null }, error: USER_NOT_FOUND };
        },
        async listUsers({ page, perPage }) {
          const all = [...state.users.values()];
          return { data: { users: structuredClone(all.slice((page - 1) * perPage, page * perPage)) }, error: null };
        },
        async deleteUser(id) {
          state.calls.push({ kind: "deleteUser", id });
          state.users.delete(id);
          state.deletedUserIds.add(id);
          state.tables.profiles = rows("profiles").filter((row) => row.id !== id);
          return { data: {}, error: null };
        },
      },
    },
    storage: {
      from: (bucket) => ({
        async remove(paths) {
          state.calls.push({ kind: "remove", bucket, paths });
          const key = `${bucket}/${paths[0]}`;
          if (state.removeErrors.has(key)) {
            return { data: null, error: { message: "simulated storage outage" } };
          }
          const removed = paths.filter((path) => state.objects.delete(`${bucket}/${path}`));
          return { data: removed.map((name) => ({ name })), error: null };
        },
        async list(directory, { search }) {
          const prefix = `${bucket}/${directory}/`;
          const names = [...state.objects].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
          return { data: names.filter((name) => !name.includes("/") && name.includes(search)).map((name) => ({ name })), error: null };
        },
      }),
    },
  };
  return { client, state };
}

const destructiveCalls = (state) => state.calls.filter((call) => ["delete", "remove", "deleteUser"].includes(call.kind));

// ---------------------------------------------------------------------------
// Fixture: remote state and manifest exactly as a completed (kept) run leaves them,
// plus unrelated real data that must never be touched.
// ---------------------------------------------------------------------------

function buildRun({ runId = RUN_ID } = {}) {
  const companyA = randomUUID();
  const companyB = randomUUID();
  const userIds = Object.fromEntries(["admin_a", "employee_a", "employee_a2", "admin_b", "employee_b"].map((label) => [label, randomUUID()]));
  const ids = {
    policyA: randomUUID(), policyB: randomUUID(), campaignA: randomUUID(), campaignB: randomUUID(),
    missionA: randomUUID(), missionB: randomUUID(), documentA: randomUUID(), documentB: randomUUID(),
    certificateA: randomUUID(), certificateB: randomUUID(), notificationA: randomUUID(),
  };
  const paths = {
    documentA: storagePath("policy-documents", companyA, runId, ids.documentA),
    documentB: storagePath("policy-documents", companyB, runId, ids.documentB),
    certificateA: storagePath("certificates", companyA, runId, ids.certificateA),
    certificateB: storagePath("certificates", companyB, runId, ids.certificateB),
  };
  const companyOf = { admin_a: companyA, employee_a: companyA, employee_a2: companyA, admin_b: companyB, employee_b: companyB };

  const realCompany = randomUUID();
  const realUser = randomUUID();
  const realPath = `company/${realCompany}/policy-documents/real-handbook.pdf`;

  const tables = {
    companies: [
      { id: companyA, name: companyName(runId, "A"), industry: MARKER, created_at: at(1000) },
      { id: companyB, name: companyName(runId, "B"), industry: MARKER, created_at: at(1200) },
      { id: realCompany, name: "Acme Mining", industry: "Mining", created_at: "2025-01-01T00:00:00.000Z" },
    ],
    profiles: [
      ...Object.entries(userIds).map(([label, id]) => ({
        id, company_id: companyOf[label], email: userEmail(runId, label), employee_number: `${MARKER}_${runId}_${label.toUpperCase()}`,
      })),
      { id: realUser, company_id: realCompany, email: "worker@acme.example", employee_number: "E-1" },
    ],
    policies: [
      { id: ids.policyA, company_id: companyA, title: `${MARKER} ${runId} POLICY A` },
      { id: ids.policyB, company_id: companyB, title: `${MARKER} ${runId} POLICY B` },
    ],
    campaigns: [
      { id: ids.campaignA, company_id: companyA, policy_id: ids.policyA, name: `${MARKER} ${runId} CAMPAIGN A` },
      { id: ids.campaignB, company_id: companyB, policy_id: ids.policyB, name: `${MARKER} ${runId} CAMPAIGN B` },
    ],
    policy_documents: [
      { id: ids.documentA, policy_id: ids.policyA, company_id: companyA, file_name: `${MARKER}-${runId}-A.pdf`, storage_path: paths.documentA },
      { id: ids.documentB, policy_id: ids.policyB, company_id: companyB, file_name: `${MARKER}-${runId}-B.pdf`, storage_path: paths.documentB },
      { id: randomUUID(), policy_id: randomUUID(), company_id: realCompany, file_name: "handbook.pdf", storage_path: realPath },
    ],
    daily_missions: [
      { id: ids.missionA, campaign_id: ids.campaignA, employee_id: userIds.employee_a, title: `${MARKER} Mission A` },
      { id: ids.missionB, campaign_id: ids.campaignB, employee_id: userIds.employee_b, title: `${MARKER} Mission B` },
    ],
    mission_progress: [
      { id: randomUUID(), mission_id: ids.missionA, employee_id: userIds.employee_a },
      { id: randomUUID(), mission_id: ids.missionB, employee_id: userIds.employee_b },
    ],
    certificates: [
      { id: ids.certificateA, company_id: companyA, employee_id: userIds.employee_a, campaign_id: ids.campaignA,
        certificate_number: `${MARKER}-${runId}-CERT-A`, storage_path: paths.certificateA },
      { id: ids.certificateB, company_id: companyB, employee_id: userIds.employee_b, campaign_id: ids.campaignB,
        certificate_number: `${MARKER}-${runId}-CERT-B`, storage_path: paths.certificateB },
    ],
    notifications: [
      { id: ids.notificationA, company_id: companyA, user_id: userIds.employee_a, title: `${MARKER} ${runId} Notification A` },
      { id: randomUUID(), company_id: companyB, user_id: userIds.employee_b, title: `${MARKER} ${runId} Notification B` },
    ],
    employee_xp: [
      { id: randomUUID(), employee_id: userIds.employee_a },
      { id: randomUUID(), employee_id: userIds.employee_b },
    ],
    campaign_participants: [
      { id: randomUUID(), campaign_id: ids.campaignA, employee_id: userIds.employee_a2 },
      { id: randomUUID(), campaign_id: ids.campaignA, employee_id: userIds.employee_a },
      { id: randomUUID(), campaign_id: ids.campaignB, employee_id: userIds.employee_b },
    ],
  };

  const users = [
    ...Object.entries(userIds).map(([label, id]) => ({
      id, email: userEmail(runId, label), created_at: at(2000), user_metadata: { marker: MARKER, run_id: runId },
    })),
    { id: realUser, email: "worker@acme.example", created_at: "2025-01-01T00:00:00.000Z", user_metadata: {} },
  ];

  const objects = [
    `policy-documents/${paths.documentA}`, `policy-documents/${paths.documentB}`,
    `certificates/${paths.certificateA}`, `certificates/${paths.certificateB}`,
    `policy-documents/${realPath}`,
  ];

  const manifest = {
    version: 1,
    marker: MARKER,
    runId,
    targetProjectRef: PROJECT,
    createdAt: new Date(Number(runId.split("-")[0])).toISOString(),
    status: "kept",
    companies: [{ id: companyA, name: companyName(runId, "A") }, { id: companyB, name: companyName(runId, "B") }],
    users: Object.entries(userIds).map(([label, id]) => ({ label, email: userEmail(runId, label), id })),
    storage: [
      { bucket: "policy-documents", path: paths.documentA },
      { bucket: "policy-documents", path: paths.documentB },
      { bucket: "certificates", path: paths.certificateA },
      { bucket: "certificates", path: paths.certificateB },
    ],
  };

  return { manifest, remote: { tables, users, objects }, companyA, companyB, userIds, ids, paths, realCompany, realUser, realPath };
}

function assertRealDataIntact(state, run) {
  assert.ok(state.tables.companies.some((row) => row.id === run.realCompany), "real company deleted");
  assert.ok(state.tables.profiles.some((row) => row.id === run.realUser), "real profile deleted");
  assert.ok(state.users.has(run.realUser), "real auth user deleted");
  assert.ok(state.objects.has(`policy-documents/${run.realPath}`), "real storage object deleted");
}

const clean = (client, manifest) => cleanupRun(client, manifest, { targetProjectRef: PROJECT });

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

test("valid manifest for the guarded Staging project is accepted", () => {
  const { manifest } = buildRun();
  const run = validateManifest(manifest, PROJECT);
  assert.equal(run.runId, RUN_ID);
  assert.equal(run.companies.length, 2);
  assert.equal(run.users.length, 5);
  assert.equal(run.storage.length, 4);
});

test("manifest for a different project is rejected before any remote request", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  assert.throws(() => validateManifest(run.manifest, "abcdefghijklmnopqrst"), /not the guarded target/);
  const result = await cleanupRun(client, run.manifest, { targetProjectRef: "abcdefghijklmnopqrst" });
  assert.equal(result.status, "incomplete");
  assert.equal(state.calls.length, 0);
});

test("malformed or edited manifests are rejected", () => {
  const cases = {
    "not an object": () => [],
    "missing version": (m) => { delete m.version; },
    "unsupported version": (m) => { m.version = 2; },
    "wrong marker": (m) => { m.marker = "OTHER"; },
    "malformed runId": (m) => { m.runId = "../../etc"; },
    "unexpected top-level field": (m) => { m.tables = ["companies"]; },
    "unknown status": (m) => { m.status = "delete_everything"; },
    "companies not an array": (m) => { m.companies = {}; },
    "createdAt not matching runId": (m) => { m.createdAt = "2020-01-01T00:00:00.000Z"; },
    "edited company name": (m) => { m.companies[0].name = "Acme Mining"; },
    "malformed company id": (m) => { m.companies[0].id = "1 OR 1=1"; },
    "extra company": (m) => { m.companies.push({ id: randomUUID(), name: companyName(m.runId, "C") }); },
    "extra field on company": (m) => { m.companies[0].filter = "industry=Mining"; },
    "edited user email": (m) => { m.users[1].email = "ceo@acme.example"; },
    "reordered user labels": (m) => { [m.users[0], m.users[1]] = [m.users[1], m.users[0]]; },
    "missing id before the last user": (m) => { m.users[0].id = null; },
    "duplicate user id": (m) => { m.users[1].id = m.users[0].id; },
    "unknown bucket": (m) => { m.storage[0].bucket = "avatars"; },
    "path traversal": (m) => { m.storage[0].path = `company/${m.companies[0].id}/policy-documents/../../other/${m.runId}-${randomUUID()}.pdf`; },
    "unexpected path prefix": (m) => { m.storage[0].path = `tenant/${m.companies[0].id}/policy-documents/${m.runId}-${randomUUID()}.pdf`; },
    "path folder differs from bucket": (m) => { m.storage[0].path = m.storage[2].path; },
    "path under a company outside the manifest": (m) => { m.storage[0].path = storagePath("policy-documents", randomUUID(), m.runId, randomUUID()); },
    "path from a different run": (m) => { m.storage[0].path = storagePath("policy-documents", m.companies[0].id, `${RUN_START + 5}-deadbeef`, randomUUID()); },
    "path merely containing the run id": (m) => { m.storage[0].path = `company/${m.companies[0].id}/policy-documents/x-${m.runId}-${randomUUID()}.pdf`; },
    "uppercase UUID in path": (m) => { m.storage[0].path = m.storage[0].path.replace(m.companies[0].id, m.companies[0].id.toUpperCase()); },
    "storage before all users": (m) => { m.users.pop(); },
  };
  for (const [name, edit] of Object.entries(cases)) {
    const { manifest } = buildRun();
    const edited = edit(manifest) ?? manifest;
    assert.throws(() => validateManifest(edited, PROJECT), ManifestError, name);
  }
});

test("truncated or oversized manifest files are rejected", () => {
  const directory = mkdtempSync(join(tmpdir(), "safetyxp-cleanup-test-"));
  const truncated = join(directory, "truncated.json");
  writeFileSync(truncated, JSON.stringify(buildRun().manifest).slice(0, 120));
  assert.throws(() => readManifestFile(truncated), /not valid JSON/);
  const oversized = join(directory, "oversized.json");
  writeFileSync(oversized, " ".repeat(300 * 1024));
  assert.throws(() => readManifestFile(oversized), /larger than/);
});

test("an invalid manifest causes no requests during cleanup", async () => {
  const run = buildRun();
  run.manifest.storage[0].bucket = "avatars";
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.match(result.failures[0], /Manifest rejected/);
  assert.equal(state.calls.length, 0);
});

// ---------------------------------------------------------------------------
// Cleanup decisions
// ---------------------------------------------------------------------------

test("verified run resources are deleted and real data is untouched", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "clean", JSON.stringify(result, null, 2));
  assert.equal(result.deleted.length, 11);
  assert.ok(result.verification.every((entry) => entry.gone));
  assert.deepEqual(result.skipped, []);
  assertRealDataIntact(state, run);
  assert.equal(state.tables.companies.length, 1);
  assert.equal(state.users.size, 1);
});

test("a consistently changed run id deletes nothing", async () => {
  const run = buildRun();
  const other = buildRun({ runId: `${RUN_START + 7}-0badc0de` });
  // Attacker-edited manifest: internally consistent for another run id, but pointing at this run's resources.
  other.manifest.companies.forEach((company, index) => { company.id = run.manifest.companies[index].id; });
  other.manifest.users.forEach((user, index) => { user.id = run.manifest.users[index].id; });
  other.manifest.storage = run.manifest.storage.map(({ bucket, path }) => ({ bucket, path: path.replace(RUN_ID, other.manifest.runId) }));
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, other.manifest);
  assert.equal(result.status, "incomplete");
  assert.equal(destructiveCalls(state).length, 0);
  assert.equal(result.deleted.length, 0);
});

test("a company id pointed at a real company is skipped, with its storage", async () => {
  const run = buildRun();
  run.manifest.companies[0].id = run.realCompany;
  run.manifest.storage = run.manifest.storage.filter((object) => !object.path.includes(run.companyA));
  run.manifest.storage.push({ bucket: "policy-documents", path: storagePath("policy-documents", run.realCompany, RUN_ID, randomUUID()) });
  // Plant an object at that path so only ownership checks can prevent its removal.
  run.remote.objects.push(`policy-documents/${run.manifest.storage.at(-1).path}`);
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.ok(result.skipped.some((entry) => entry.startsWith(`company ${companyName(RUN_ID, "A")}`) && /ownership not proven/.test(entry)));
  assert.ok(result.skipped.some((entry) => entry.includes(run.realCompany) && /owning company is foreign/.test(entry)));
  assert.ok(state.objects.has(`policy-documents/${run.manifest.storage.at(-1).path}`));
  assertRealDataIntact(state, run);
});

test("a foreign profile in a test company blocks that company and its users", async () => {
  const run = buildRun();
  run.remote.tables.profiles.push({ id: randomUUID(), company_id: run.companyA, email: "intruder@acme.example", employee_number: "E-9" });
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.ok(result.skipped.some((entry) => /COMPANY_A: linked data not attributable.*profiles\.company_id has 1 row/.test(entry)));
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA));
  for (const label of ["admin_a", "employee_a", "employee_a2"]) {
    assert.ok(state.users.has(run.userIds[label]), `${label} must remain while its profile exists`);
  }
  assert.ok(!state.tables.companies.some((row) => row.id === run.companyB), "verified company B is still cleaned");
  assertRealDataIntact(state, run);
});

test("unseeded linked rows or uninspectable tables block company deletion", async () => {
  const withAuditLog = buildRun();
  withAuditLog.remote.tables.audit_logs = [{ id: randomUUID(), company_id: withAuditLog.companyB, user_id: null }];
  let fake = createFakeAdmin(withAuditLog.remote);
  let result = await clean(fake.client, withAuditLog.manifest);
  assert.ok(result.skipped.some((entry) => /COMPANY_B: .*audit_logs\.company_id/.test(entry)));
  assert.ok(fake.state.tables.companies.some((row) => row.id === withAuditLog.companyB));

  const foreignParticipant = buildRun();
  foreignParticipant.remote.tables.campaign_participants.push({ id: randomUUID(), campaign_id: foreignParticipant.ids.campaignB, employee_id: foreignParticipant.realUser });
  fake = createFakeAdmin(foreignParticipant.remote);
  result = await clean(fake.client, foreignParticipant.manifest);
  assert.ok(result.skipped.some((entry) => /COMPANY_B: .*campaign_participants\.campaign_id/.test(entry)));
  assertRealDataIntact(fake.state, foreignParticipant);

  const uninspectable = buildRun();
  fake = createFakeAdmin(uninspectable.remote);
  fake.state.tableErrors.set("employee_invitations", "permission denied");
  result = await clean(fake.client, uninspectable.manifest);
  assert.equal(result.status, "incomplete");
  assert.ok(result.skipped.some((entry) => /employee_invitations\.company_id could not be inspected/.test(entry)));
  assert.ok(!fake.state.calls.some((call) => call.kind === "delete" && call.table === "companies"));
});

test("users with missing or mismatched metadata are not deleted", async () => {
  const run = buildRun();
  const users = new Map(run.remote.users.map((user) => [user.id, user]));
  users.get(run.userIds.employee_b).user_metadata = {};
  users.get(run.userIds.admin_b).user_metadata = { marker: MARKER, run_id: `${RUN_START}-00000000` };
  users.get(run.userIds.employee_a2).email = "real.person@acme.example";
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  for (const label of ["employee_b", "admin_b", "employee_a2"]) {
    assert.ok(state.users.has(run.userIds[label]), `${label} must not be deleted`);
    assert.ok(result.skipped.some((entry) => entry.startsWith(`auth user ${userEmail(RUN_ID, label)}`)));
  }
  // Their profiles are not attributable, so neither company is deleted (no cascade onto them).
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA));
  assert.ok(state.tables.companies.some((row) => row.id === run.companyB));
});

test("resources created outside the run's time window are not owned", async () => {
  const run = buildRun();
  run.remote.tables.companies[1].created_at = "2025-01-01T00:00:00.000Z";
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.ok(result.skipped.some((entry) => /COMPANY_B: ownership not proven \(created outside/.test(entry)));
  assert.ok(state.tables.companies.some((row) => row.id === run.companyB));
});

test("storage objects without a matching run record are skipped", async () => {
  const run = buildRun();
  run.remote.tables.certificates = run.remote.tables.certificates.filter((row) => row.id !== run.ids.certificateA);
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.ok(result.skipped.some((entry) => entry.includes(run.paths.certificateA) && /no matching certificates record/.test(entry)));
  assert.ok(state.objects.has(`certificates/${run.paths.certificateA}`));
  assert.ok(result.skipped.some((entry) => /COMPANY_A: its storage objects were not all removed/.test(entry)));
});

test("resources that are already gone are reported as absent", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin({ tables: { companies: [run.remote.tables.companies[2]] }, users: [run.remote.users.at(-1)], objects: [] });
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "clean");
  assert.equal(result.absent.length, 11);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.failures, []);
  assert.equal(destructiveCalls(state).length, 0);
});

test("partial cleanup followed by a retry completes without touching other data", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  state.removeErrors.add(`certificates/${run.paths.certificateB}`);

  const first = await clean(client, run.manifest);
  assert.equal(first.status, "incomplete");
  assert.ok(first.failures.some((entry) => entry.includes(run.paths.certificateB)));
  assert.ok(first.skipped.some((entry) => /COMPANY_B: its storage objects were not all removed/.test(entry)));
  assert.ok(state.tables.companies.some((row) => row.id === run.companyB), "company B kept until its storage is gone");
  assert.ok(state.users.has(run.userIds.employee_b), "company B users kept while their profiles exist");
  assert.ok(!state.tables.companies.some((row) => row.id === run.companyA), "company A cleaned on the first pass");

  state.removeErrors.clear();
  const retry = await clean(client, run.manifest);
  assert.equal(retry.status, "clean", JSON.stringify(retry, null, 2));
  assert.ok(retry.absent.some((entry) => entry.includes(companyName(RUN_ID, "A"))));
  assert.ok(retry.deleted.some((entry) => entry.includes(run.paths.certificateB)));
  assert.equal(state.tables.companies.length, 1);
  assert.equal(state.users.size, 1);
  assertRealDataIntact(state, run);

  const third = await clean(client, run.manifest);
  assert.equal(third.status, "clean");
  assert.equal(destructiveCalls(state).filter((call) => call.kind === "deleteUser").length, 5, "no extra deletions on later retries");
});

test("a crash before the last user got an id is still cleaned by email lookup", async () => {
  const run = buildRun();
  // The crash happened before seeding, so no objects were uploaded.
  run.manifest.storage = [];
  run.manifest.users[4].id = null;
  run.remote.objects = run.remote.objects.filter((key) => key.includes(run.realPath));
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "clean", JSON.stringify(result, null, 2));
  assert.ok(!state.users.has(run.userIds.employee_b));
  assertRealDataIntact(state, run);
});

// ---------------------------------------------------------------------------
// Notification deliveries and Auth-user references
// ---------------------------------------------------------------------------

const delivery = (notificationId, companyId) => ({
  id: randomUUID(), notification_id: notificationId, company_id: companyId,
  recipient: "in-app", channel: "IN_APP", provider: "internal", status: "QUEUED", idempotency_key: randomUUID(),
});

test("a foreign delivery referencing a run notification prevents company deletion", async () => {
  const run = buildRun();
  run.remote.tables.notification_deliveries = [delivery(run.ids.notificationA, run.realCompany)];
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.ok(result.skipped.some((entry) => /COMPANY_A: .*notification_deliveries\.notification_id has 1 row/.test(entry)));
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA));
  assert.equal(state.tables.notification_deliveries.length, 1, "foreign delivery must survive");
  assertRealDataIntact(state, run);
});

test("a delivery of a run notification inside the run company is attributable", async () => {
  const run = buildRun();
  run.remote.tables.notification_deliveries = [delivery(run.ids.notificationA, run.companyA)];
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "clean", JSON.stringify(result, null, 2));
  assert.equal(state.tables.notification_deliveries.length, 0);
  assertRealDataIntact(state, run);
});

test("a run-company delivery of a non-run notification prevents company deletion", async () => {
  const run = buildRun();
  run.remote.tables.notification_deliveries = [delivery(randomUUID(), run.companyA)];
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.ok(result.skipped.some((entry) => /COMPANY_A: .*notification_deliveries\.company_id has 1 row/.test(entry)));
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA));
});

test("deliveries of a non-run notification are reported, not treated as run-owned", async () => {
  const run = buildRun();
  const foreignNotification = { id: randomUUID(), company_id: run.companyA, user_id: run.userIds.employee_a, title: "Real reminder" };
  run.remote.tables.notifications.push(foreignNotification);
  run.remote.tables.notification_deliveries = [delivery(foreignNotification.id, run.companyA)];
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  const reason = result.skipped.find((entry) => entry.includes(`company ${companyName(RUN_ID, "A")}`));
  assert.match(reason, /notifications\.company_id has 1 row/);
  assert.match(reason, /notification_deliveries\.company_id has 1 row/);
  assert.match(reason, /notification_deliveries\.notification_id has 1 row/);
  assert.equal(state.tables.notification_deliveries.length, 1);
});

test("an Auth user still referenced through created_by is skipped, and the row is kept", async () => {
  for (const table of ["policies", "campaigns", "generated_content"]) {
    const run = buildRun();
    const referencing = { id: randomUUID(), company_id: run.realCompany, created_by: run.userIds.admin_b, name: "Real", title: "Real" };
    run.remote.tables[table] = [...(run.remote.tables[table] ?? []), referencing];
    const { client, state } = createFakeAdmin(run.remote);
    const result = await clean(client, run.manifest);
    assert.equal(result.status, "incomplete", table);
    assert.ok(result.skipped.some((entry) => entry === `auth user ${run.userIds.admin_b}: still referenced by ${table}.created_by`), table);
    assert.ok(state.users.has(run.userIds.admin_b), `${table}: user must not be deleted`);
    assert.ok(state.tables[table].some((row) => row.id === referencing.id), `${table}: referencing row must not be deleted`);
    assert.ok(!state.calls.some((call) => call.kind === "deleteUser" && call.id === run.userIds.admin_b), table);
    assert.equal(state.users.size, 2, `${table}: the other run users are still cleaned`);
  }
});

test("an error checking created_by references skips the user instead of deleting", async () => {
  for (const table of ["policies", "campaigns", "generated_content"]) {
    const run = buildRun();
    const { client, state } = createFakeAdmin(run.remote);
    state.columnErrors.set(`${table}.created_by`, "statement timeout");
    const result = await clean(client, run.manifest);
    assert.equal(result.status, "incomplete", table);
    assert.equal(destructiveCalls(state).filter((call) => call.kind === "deleteUser").length, 0, table);
    assert.equal(result.skipped.filter((entry) => entry.includes(`${table}.created_by could not be checked (statement timeout)`)).length, 5, table);
    assert.equal(state.users.size, 6, table);
    assert.ok(!state.tables.companies.some((row) => row.id === run.companyA), `${table}: companies are unaffected by the user check`);
  }
});

// ---------------------------------------------------------------------------
// Scope regressions: rows outside the run that would cascade from run-owned rows
// (columns and FK actions per supabase/migrations 001, 004 and 007)
// ---------------------------------------------------------------------------

function skipReason(result, label) {
  return result.skipped.find((entry) => entry.startsWith(`company ${companyName(RUN_ID, label)}:`)) ?? "";
}

function realDocument(run) {
  return run.remote.tables.policy_documents.find((row) => row.company_id === run.realCompany);
}

async function assertCompanyAProtected(run, mutate, pattern) {
  mutate(run);
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.match(skipReason(result, "A"), pattern);
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA), "company A must not be deleted");
  for (const label of ["admin_a", "employee_a", "employee_a2"]) {
    assert.ok(state.users.has(run.userIds[label]), `${label} must not be deleted while company A remains`);
  }
  assertRealDataIntact(state, run);
  return { result, state };
}

test("a foreign quiz answer by a run profile blocks the company (profile scope)", async () => {
  const run = buildRun();
  const answer = {
    id: randomUUID(), company_id: run.realCompany, employee_id: run.userIds.employee_a, campaign_id: randomUUID(),
    mission_id: null, quiz_question_id: randomUUID(), selected_answer: "B", is_correct: false, score: 0, attempt: 1,
  };
  const { state } = await assertCompanyAProtected(run, (r) => { r.remote.tables.quiz_answers = [answer]; },
    /quiz_answers\.employee_id has 1 row/);
  assert.ok(state.tables.quiz_answers.some((row) => row.id === answer.id));
});

test("an AI generation job on a run policy blocks the company (policy scope)", async () => {
  const run = buildRun();
  const job = {
    id: randomUUID(), company_id: run.realCompany, policy_id: run.ids.policyA, policy_document_id: realDocument(run).id,
    campaign_id: null, created_by: run.realUser, status: "QUEUED",
  };
  await assertCompanyAProtected(run, (r) => { r.remote.tables.ai_generation_jobs = [job]; }, /ai_generation_jobs\.policy_id has 1 row/);
});

test("an AI generation job on a run policy document blocks the company (policy document scope)", async () => {
  const run = buildRun();
  const job = {
    id: randomUUID(), company_id: run.realCompany, policy_id: realDocument(run).policy_id, policy_document_id: run.ids.documentA,
    campaign_id: null, created_by: run.realUser, status: "QUEUED",
  };
  await assertCompanyAProtected(run, (r) => { r.remote.tables.ai_generation_jobs = [job]; }, /ai_generation_jobs\.policy_document_id has 1 row/);
});

test("foreign mission progress on a run mission blocks the company (mission scope)", async () => {
  const run = buildRun();
  const progress = { id: randomUUID(), mission_id: run.ids.missionA, employee_id: run.realUser, status: "scheduled", score: null };
  await assertCompanyAProtected(run, (r) => { r.remote.tables.mission_progress.push(progress); }, /mission_progress\.mission_id has 1 row/);
});

test("more than 500 linked rows block the company even if they look run-owned", async () => {
  const run = buildRun();
  const notifications = Array.from({ length: 501 }, () => ({
    id: randomUUID(), company_id: run.companyA, user_id: run.userIds.employee_a, title: `${MARKER} ${RUN_ID} Notification A`,
  }));
  await assertCompanyAProtected(run, (r) => { r.remote.tables.notifications.push(...notifications); },
    /notifications\.company_id has too many linked rows to verify/);
});

test("missions must match the seeded title, campaign and same-company employee", async () => {
  const wrongTitle = buildRun();
  await assertCompanyAProtected(wrongTitle, (r) => {
    r.remote.tables.daily_missions.find((row) => row.id === r.ids.missionA).title = `${MARKER} Mission B`;
  }, /daily_missions\.campaign_id has 1 row/);

  // Employee B is a run user, but not of company A: ownedUserIds alone used to accept this row.
  const crossCompany = buildRun();
  await assertCompanyAProtected(crossCompany, (r) => {
    r.remote.tables.daily_missions.push({ id: randomUUID(), campaign_id: r.ids.campaignA, employee_id: r.userIds.employee_b, title: `${MARKER} Mission A` });
  }, /daily_missions\.campaign_id has 1 row/);
});

// ---------------------------------------------------------------------------
// Storage record checks
// ---------------------------------------------------------------------------

async function assertObjectProtected(run, mutate, bucket, path, recordTable) {
  mutate(run);
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.ok(result.skipped.some((entry) => entry.includes(path) && entry.includes(`no matching ${recordTable} record for this run`)));
  assert.ok(state.objects.has(`${bucket}/${path}`), "object must not be removed");
  assert.ok(!state.calls.some((call) => call.kind === "remove" && call.paths.includes(path)), "no remove request for the object");
  assert.match(skipReason(result, "A"), /its storage objects were not all removed/);
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA), "company A must not be deleted");
  assertRealDataIntact(state, run);
}

test("a storage record with the wrong storage_path does not authorize removal", async () => {
  const run = buildRun();
  await assertObjectProtected(run, (r) => {
    r.remote.tables.policy_documents.find((row) => row.id === r.ids.documentA).storage_path = storagePath("policy-documents", r.companyA, RUN_ID, randomUUID());
  }, "policy-documents", run.paths.documentA, "policy_documents");
});

test("a storage record with the wrong company_id does not authorize removal", async () => {
  const run = buildRun();
  await assertObjectProtected(run, (r) => {
    r.remote.tables.certificates.find((row) => row.id === r.ids.certificateA).company_id = r.companyB;
  }, "certificates", run.paths.certificateA, "certificates");
});

test("a storage record with a missing or incorrect run marker does not authorize removal", async () => {
  const missing = buildRun();
  await assertObjectProtected(missing, (r) => {
    r.remote.tables.policy_documents.find((row) => row.id === r.ids.documentA).file_name = "handbook.pdf";
  }, "policy-documents", missing.paths.documentA, "policy_documents");

  const otherRun = buildRun();
  await assertObjectProtected(otherRun, (r) => {
    r.remote.tables.certificates.find((row) => row.id === r.ids.certificateA).certificate_number = `${MARKER}-${RUN_START + 9}-0badc0de-CERT-A`;
  }, "certificates", otherRun.paths.certificateA, "certificates");
});

test("a certificate record for a non-run employee does not authorize removal", async () => {
  const run = buildRun();
  await assertObjectProtected(run, (r) => {
    r.remote.tables.certificates.find((row) => row.id === r.ids.certificateA).employee_id = r.realUser;
  }, "certificates", run.paths.certificateA, "certificates");
});

// ---------------------------------------------------------------------------
// Not-found classification
// ---------------------------------------------------------------------------

test("a genuine Auth not-found response is reported as absent", async () => {
  const run = buildRun();
  const gone = run.userIds.employee_b;
  run.remote.users = run.remote.users.filter((user) => user.id !== gone);
  // Deleting the Auth user cascades to its profile and everything keyed by that profile.
  for (const [table, column] of [
    ["profiles", "id"], ["daily_missions", "employee_id"], ["mission_progress", "employee_id"], ["employee_xp", "employee_id"],
    ["campaign_participants", "employee_id"], ["notifications", "user_id"], ["certificates", "employee_id"],
  ]) {
    run.remote.tables[table] = run.remote.tables[table].filter((row) => row[column] !== gone);
  }
  run.remote.objects = run.remote.objects.filter((key) => !key.includes(run.paths.certificateB));
  const { client } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "clean", JSON.stringify(result, null, 2));
  assert.ok(result.absent.includes(`auth user ${userEmail(RUN_ID, "employee_b")}`));
});

test("other errors mentioning 'not found' are never treated as absent", async () => {
  const lookalikes = [
    { name: "AuthApiError", status: 404, code: undefined, message: "Route not found" },
    { name: "AuthApiError", status: 500, code: "unexpected_failure", message: "User not found in cache" },
    { name: "AuthUnknownError", message: "upstream host not found" },
  ];
  for (const error of lookalikes) {
    const run = buildRun();
    const { client, state } = createFakeAdmin(run.remote);
    state.userErrors.set(run.userIds.employee_b, error);
    const result = await clean(client, run.manifest);
    const label = `auth user ${userEmail(RUN_ID, "employee_b")}`;
    assert.equal(result.status, "incomplete", error.message);
    assert.ok(!result.absent.includes(label), error.message);
    assert.ok(result.skipped.includes(`${label}: ownership could not be verified (${error.message})`), error.message);
    assert.ok(state.users.has(run.userIds.employee_b), error.message);
    assert.ok(state.tables.companies.some((row) => row.id === run.companyB), `${error.message}: company B keeps the unverified profile`);
  }
});

test("a lookup with neither a user nor an error is not treated as absent", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  state.userErrors.set(run.userIds.employee_b, null);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.ok(result.skipped.some((entry) => entry.includes("lookup returned neither a user nor an error")));
  assert.ok(state.users.has(run.userIds.employee_b));
});

test("post-delete verification fails on a 'not found' lookalike error", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  state.userErrorAfterDelete = { name: "AuthApiError", status: 404, code: undefined, message: "Route not found" };
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "incomplete");
  assert.equal(result.failures.filter((entry) => entry.endsWith("could not verify removal (Route not found)")).length, 5);
  assert.ok(!result.verification.some((entry) => entry.resource.startsWith("auth user")));
});

test("rows linked to unverified campaigns or missions are reported, not treated as run-owned", async () => {
  const run = buildRun();
  const foreignCampaign = { id: randomUUID(), company_id: run.companyA, policy_id: null, name: "Real onboarding" };
  const foreignMission = { id: randomUUID(), campaign_id: run.ids.campaignA, employee_id: run.userIds.employee_a2, title: "Real mission" };
  const { result } = await assertCompanyAProtected(run, (r) => {
    r.remote.tables.campaigns.push(foreignCampaign);
    r.remote.tables.campaign_participants.push({ id: randomUUID(), campaign_id: foreignCampaign.id, employee_id: r.userIds.employee_a });
    r.remote.tables.daily_missions.push(foreignMission);
    // Seeded-looking title and same-company employee, but in a campaign that failed verification.
    r.remote.tables.daily_missions.push({ id: randomUUID(), campaign_id: foreignCampaign.id, employee_id: r.userIds.employee_a, title: `${MARKER} Mission A` });
    r.remote.tables.mission_progress.push({ id: randomUUID(), mission_id: foreignMission.id, employee_id: r.userIds.employee_a2 });
  }, /campaigns\.company_id has 1 row/);
  const reason = skipReason(result, "A");
  assert.match(reason, /campaign_participants\.employee_id has 1 row/);
  assert.match(reason, /daily_missions\.campaign_id has 2 row/);
  assert.match(reason, /mission_progress\.mission_id has 1 row/);
  assert.match(reason, /mission_progress\.employee_id has 1 row/);
});

// ---------------------------------------------------------------------------
// Same-company ownership for certificates and campaign participants
// (no database constraint enforces it: certificates.company_id / employee_id and
// campaign_participants.campaign_id / employee_id are independent FKs in 001)
// ---------------------------------------------------------------------------

const callsOf = (state, kind, table) => state.calls.filter((call) => call.kind === kind && (table === undefined || call.table === table));
const removeCallsFor = (state, path) => callsOf(state, "remove").filter((call) => call.paths.includes(path));

function assertNothingDeletedFromCompanies(state, run) {
  assert.equal(callsOf(state, "delete", "companies").length, 0, "no company delete request");
  assert.equal(callsOf(state, "deleteUser").length, 0, "no Auth user delete request");
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA), "company A remains");
  assert.ok(state.tables.companies.some((row) => row.id === run.companyB), "company B remains");
  for (const id of Object.values(run.userIds)) {
    assert.ok(state.users.has(id), "run users remain while their companies remain");
  }
  assertRealDataIntact(state, run);
}

test("seeded certificates and participants still clean up, with the expected destructive calls", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);
  assert.equal(result.status, "clean", JSON.stringify(result, null, 2));
  assert.equal(callsOf(state, "remove").length, 4);
  assert.equal(removeCallsFor(state, run.paths.certificateA).length, 1);
  assert.equal(removeCallsFor(state, run.paths.certificateB).length, 1);
  assert.equal(callsOf(state, "delete", "companies").length, 2);
  assert.equal(callsOf(state, "deleteUser").length, 5);
  // The fake cascades only company_id children; participants cascade via campaigns (001:83) in the real schema.
  assert.equal(state.tables.certificates.length, 0, "seeded certificates removed with their companies");
  assertRealDataIntact(state, run);
});

test("a company A certificate for company B's run employee keeps its object and blocks both companies", async () => {
  const run = buildRun();
  run.remote.tables.certificates.find((row) => row.id === run.ids.certificateA).employee_id = run.userIds.employee_b;
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);

  assert.equal(result.status, "incomplete");
  assert.equal(removeCallsFor(state, run.paths.certificateA).length, 0, "no remove request for the certificate object");
  assert.ok(state.objects.has(`certificates/${run.paths.certificateA}`));
  assert.ok(result.skipped.some((entry) => entry.includes(run.paths.certificateA) && /employee is not a verified run profile of this company/.test(entry)));
  assert.match(skipReason(result, "A"), /its storage objects were not all removed/);
  assert.match(skipReason(result, "B"), /certificates.employee_id has 1 row/);
  assertNothingDeletedFromCompanies(state, run);
  assert.ok(state.tables.certificates.some((row) => row.id === run.ids.certificateA), "certificate row remains");
});

test("a cross-company certificate row blocks company A even when its object is already gone", async () => {
  const run = buildRun();
  run.remote.tables.certificates.find((row) => row.id === run.ids.certificateA).employee_id = run.userIds.employee_b;
  run.remote.objects = run.remote.objects.filter((key) => !key.includes(run.paths.certificateA));
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);

  assert.equal(result.status, "incomplete");
  assert.ok(result.absent.includes(`storage certificates/${run.paths.certificateA}`));
  assert.match(skipReason(result, "A"), /certificates.company_id has 1 row/);
  assert.match(skipReason(result, "A"), /certificates.campaign_id has 1 row/);
  assert.match(skipReason(result, "B"), /certificates.employee_id has 1 row/);
  assertNothingDeletedFromCompanies(state, run);
});

test("an employee profile lookup error prevents certificate object removal", async () => {
  const run = buildRun();
  const { client, state } = createFakeAdmin(run.remote);
  state.columnErrors.set("profiles.id", "connection reset");
  const result = await clean(client, run.manifest);

  assert.equal(result.status, "incomplete");
  for (const path of [run.paths.certificateA, run.paths.certificateB]) {
    assert.equal(removeCallsFor(state, path).length, 0, "no remove request for certificate objects");
    assert.ok(state.objects.has(`certificates/${path}`));
    assert.ok(result.skipped.some((entry) => entry.includes(path) && entry.includes("employee profile check failed: connection reset")));
  }
  assert.match(skipReason(result, "A"), /its storage objects were not all removed/);
  assert.match(skipReason(result, "B"), /its storage objects were not all removed/);
  assertNothingDeletedFromCompanies(state, run);
});

test("a cross-company participant blocks both companies whichever company owns the campaign", async () => {
  for (const [campaign, employee] of [["campaignA", "employee_b"], ["campaignB", "employee_a"]]) {
    const run = buildRun();
    const participant = { id: randomUUID(), campaign_id: run.ids[campaign], employee_id: run.userIds[employee] };
    run.remote.tables.campaign_participants.push(participant);
    const { client, state } = createFakeAdmin(run.remote);
    const result = await clean(client, run.manifest);

    const [campaignCompany, employeeCompany] = campaign === "campaignA" ? ["A", "B"] : ["B", "A"];
    assert.equal(result.status, "incomplete", campaign);
    assert.match(skipReason(result, campaignCompany), /campaign_participants\.campaign_id has 1 row/, campaign);
    assert.match(skipReason(result, employeeCompany), /campaign_participants\.employee_id has 1 row/, campaign);
    assertNothingDeletedFromCompanies(state, run);
    assert.ok(state.tables.campaign_participants.some((row) => row.id === participant.id), `${campaign}: participant row remains`);
  }
});

test("a participant on an unverified campaign blocks that company only", async () => {
  const run = buildRun();
  const foreignCampaign = { id: randomUUID(), company_id: run.companyA, policy_id: null, name: "Real onboarding" };
  const participant = { id: randomUUID(), campaign_id: foreignCampaign.id, employee_id: run.userIds.employee_a2 };
  run.remote.tables.campaigns.push(foreignCampaign);
  run.remote.tables.campaign_participants.push(participant);
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);

  assert.equal(result.status, "incomplete");
  assert.match(skipReason(result, "A"), /campaign_participants\.campaign_id has 1 row/);
  assert.equal(callsOf(state, "delete", "companies").length, 1, "only company B is deleted");
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA));
  assert.ok(!state.tables.companies.some((row) => row.id === run.companyB));
  assert.ok(state.tables.campaign_participants.some((row) => row.id === participant.id));
  for (const label of ["admin_a", "employee_a", "employee_a2"]) {
    assert.ok(state.users.has(run.userIds[label]), `${label} remains`);
    assert.ok(!callsOf(state, "deleteUser").some((call) => call.id === run.userIds[label]), `${label}: no delete request`);
  }
  assertRealDataIntact(state, run);
});

test("a certificate whose employee's Auth user fails verification keeps its object", async () => {
  const run = buildRun();
  run.remote.users.find((user) => user.id === run.userIds.employee_a).user_metadata = { marker: MARKER, run_id: `${RUN_START}-00000000` };
  const { client, state } = createFakeAdmin(run.remote);
  const result = await clean(client, run.manifest);

  assert.equal(result.status, "incomplete");
  assert.equal(removeCallsFor(state, run.paths.certificateA).length, 0, "no remove request for the certificate object");
  assert.ok(state.objects.has(`certificates/${run.paths.certificateA}`));
  assert.ok(result.skipped.some((entry) => entry.includes(run.paths.certificateA) && /employee is not a verified run profile of this company/.test(entry)));
  assert.match(skipReason(result, "A"), /its storage objects were not all removed/);
  assert.ok(state.tables.companies.some((row) => row.id === run.companyA), "company A remains");
  assert.ok(state.users.has(run.userIds.employee_a), "unverified user is not deleted");
  assertRealDataIntact(state, run);
});
