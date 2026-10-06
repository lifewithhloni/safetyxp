import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const MARKER = "SAFETYXP_SECURITY_TEST";
const NOW = new Date();
const DATE_ONLY = NOW.toISOString().slice(0, 10);
const DEFAULT_PASSWORD = "SafetyXP_Test_Password_2026!";

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

function createReportBucket() {
  return {
    generatedAt: new Date().toISOString(),
    marker: MARKER,
    checks: [],
    idor: [],
    passed: 0,
    failed: 0,
  };
}

async function getOrCreateAuthUser(adminClient, email, password) {
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    throw new Error(`Unable to list users: ${listError.message}`);
  }

  const existing = (listData.users ?? []).find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { marker: MARKER },
    });
    if (updateError) {
      throw new Error(`Unable to update user ${email}: ${updateError.message}`);
    }
    return existing.id;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { marker: MARKER },
  });

  if (error || !data.user) {
    throw new Error(`Unable to create user ${email}: ${error?.message ?? "unknown"}`);
  }

  return data.user.id;
}

async function upsertProfile(adminClient, profile) {
  const payload = {
    id: profile.id,
    company_id: profile.company_id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role,
    job_title: `${MARKER} ${profile.role}`,
    department_id: null,
    employee_number: profile.employee_number,
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Unable to upsert profile ${profile.email}: ${error.message}`);
  }
}

async function upsertCompany(adminClient, companyId, name) {
  const { error } = await adminClient
    .from("companies")
    .upsert(
      {
        id: companyId,
        name,
        industry: MARKER,
        logo_url: null,
        timezone: "UTC",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`Unable to upsert company ${name}: ${error.message}`);
  }
}

async function ensureBucket(adminClient, bucketName) {
  const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
  if (listError) {
    throw new Error(`Unable to list storage buckets: ${listError.message}`);
  }

  if ((buckets ?? []).some((bucket) => bucket.name === bucketName)) {
    return;
  }

  const { error: createError } = await adminClient.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "text/plain"],
  });

  if (createError) {
    throw new Error(`Unable to create bucket ${bucketName}: ${createError.message}`);
  }
}

async function seedData(adminClient, ids) {
  await ensureBucket(adminClient, "policy-documents");
  await ensureBucket(adminClient, "certificates");

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
  const questionAId = randomUUID();
  const scenarioAId = randomUUID();

  const policyDocumentAPath = `company/${ids.companyA}/policy-documents/${documentAId}.txt`;
  const policyDocumentBPath = `company/${ids.companyB}/policy-documents/${documentBId}.txt`;
  const certificateAPath = `company/${ids.companyA}/certificates/${certificateAId}.pdf`;
  const certificateBPath = `company/${ids.companyB}/certificates/${certificateBId}.pdf`;

  const { error: policyError } = await adminClient.from("policies").insert([
    {
      id: policyAId,
      company_id: ids.companyA,
      title: `${MARKER} POLICY A`,
      description: `${MARKER} policy A`,
      status: "active",
      created_by: ids.adminA,
    },
    {
      id: policyBId,
      company_id: ids.companyB,
      title: `${MARKER} POLICY B`,
      description: `${MARKER} policy B`,
      status: "active",
      created_by: ids.adminB,
    },
  ]);
  if (policyError) {
    throw new Error(`Unable to seed policies: ${policyError.message}`);
  }

  const { error: campaignsError } = await adminClient.from("campaigns").insert([
    {
      id: campaignAId,
      company_id: ids.companyA,
      policy_id: policyAId,
      name: `${MARKER} CAMPAIGN A`,
      description: `${MARKER} campaign A`,
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
      name: `${MARKER} CAMPAIGN B`,
      description: `${MARKER} campaign B`,
      official_deadline: `${DATE_ONLY}T23:59:59Z`,
      learning_deadline: `${DATE_ONLY}T23:59:59Z`,
      buffer_days: 0,
      status: "active",
      created_by: ids.adminB,
    },
  ]);
  if (campaignsError) {
    throw new Error(`Unable to seed campaigns: ${campaignsError.message}`);
  }

  const { error: questionsError } = await adminClient.from("quiz_questions").insert({
    id: questionAId,
    campaign_id: campaignAId,
    module_id: null,
    question: `${MARKER} Quiz question A`,
    options: ["A", "B", "C"],
    correct_answer: "A",
    explanation: "A",
    difficulty: "easy",
    xp_reward: 10,
    status: "active",
    source_document_id: null,
    source_reference: null,
  });
  if (questionsError) {
    throw new Error(`Unable to seed quiz question: ${questionsError.message}`);
  }

  const { error: scenariosError } = await adminClient.from("scenarios").insert({
    id: scenarioAId,
    campaign_id: campaignAId,
    module_id: null,
    title: `${MARKER} Scenario A`,
    situation: "Test scenario",
    options: ["Option A", "Option B"],
    correct_response: "Option A",
    explanation: "Option A is correct",
    learning_objective: "Test",
    xp_reward: 10,
    status: "active",
    source_document_id: null,
    source_reference: null,
  });
  if (scenariosError) {
    throw new Error(`Unable to seed scenario: ${scenariosError.message}`);
  }

  const { error: documentsError } = await adminClient.from("policy_documents").insert([
    {
      id: documentAId,
      policy_id: policyAId,
      company_id: ids.companyA,
      file_name: `${MARKER}-A.txt`,
      storage_path: policyDocumentAPath,
      file_type: "text/plain",
      file_size: 32,
      page_count: 1,
      extracted_text: `${MARKER} text A`,
      processing_status: "completed",
    },
    {
      id: documentBId,
      policy_id: policyBId,
      company_id: ids.companyB,
      file_name: `${MARKER}-B.txt`,
      storage_path: policyDocumentBPath,
      file_type: "text/plain",
      file_size: 32,
      page_count: 1,
      extracted_text: `${MARKER} text B`,
      processing_status: "completed",
    },
  ]);
  if (documentsError) {
    throw new Error(`Unable to seed policy documents: ${documentsError.message}`);
  }

  const { error: missionsError } = await adminClient.from("daily_missions").insert([
    {
      id: missionAId,
      campaign_id: campaignAId,
      employee_id: ids.employeeA,
      module_id: null,
      scheduled_date: DATE_ONLY,
      type: "quiz",
      title: `${MARKER} Mission A`,
      description: `${MARKER}`,
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
      description: `${MARKER}`,
      estimated_minutes: 10,
      order_index: 1,
      status: "scheduled",
      xp_reward: 10,
    },
  ]);
  if (missionsError) {
    throw new Error(`Unable to seed missions: ${missionsError.message}`);
  }

  const { error: progressError } = await adminClient.from("mission_progress").insert([
    {
      mission_id: missionAId,
      employee_id: ids.employeeA,
      status: "scheduled",
      score: null,
    },
    {
      mission_id: missionBId,
      employee_id: ids.employeeB,
      status: "scheduled",
      score: null,
    },
  ]);
  if (progressError) {
    throw new Error(`Unable to seed mission progress: ${progressError.message}`);
  }

  const { error: certificateError } = await adminClient.from("certificates").insert([
    {
      id: certificateAId,
      company_id: ids.companyA,
      employee_id: ids.employeeA,
      campaign_id: campaignAId,
      certificate_number: `${MARKER}-CERT-A-${Date.now()}`,
      issued_at: NOW.toISOString(),
      expires_at: new Date(NOW.getTime() + 86400000).toISOString(),
      status: "issued",
      verification_code: `${MARKER}-VERIFY-A-${Date.now()}`,
      storage_path: certificateAPath,
      updated_at: NOW.toISOString(),
    },
    {
      id: certificateBId,
      company_id: ids.companyB,
      employee_id: ids.employeeB,
      campaign_id: campaignBId,
      certificate_number: `${MARKER}-CERT-B-${Date.now()}`,
      issued_at: NOW.toISOString(),
      expires_at: new Date(NOW.getTime() + 86400000).toISOString(),
      status: "issued",
      verification_code: `${MARKER}-VERIFY-B-${Date.now()}`,
      storage_path: certificateBPath,
      updated_at: NOW.toISOString(),
    },
  ]);
  if (certificateError) {
    throw new Error(`Unable to seed certificates: ${certificateError.message}`);
  }

  const { error: notificationsError } = await adminClient.from("notifications").insert([
    {
      company_id: ids.companyA,
      user_id: ids.employeeA,
      type: "DailyMissionAvailable",
      title: `${MARKER} Notification A`,
      message: `${MARKER} A`,
      priority: "normal",
      channel: "IN_APP",
      status: "pending",
    },
    {
      company_id: ids.companyB,
      user_id: ids.employeeB,
      type: "DailyMissionAvailable",
      title: `${MARKER} Notification B`,
      message: `${MARKER} B`,
      priority: "normal",
      channel: "IN_APP",
      status: "pending",
    },
  ]);
  if (notificationsError) {
    throw new Error(`Unable to seed notifications: ${notificationsError.message}`);
  }

  const { error: xpError } = await adminClient.from("employee_xp").upsert([
    {
      employee_id: ids.employeeA,
      total_xp: 50,
      current_level: 1,
      updated_at: NOW.toISOString(),
    },
    {
      employee_id: ids.employeeB,
      total_xp: 70,
      current_level: 1,
      updated_at: NOW.toISOString(),
    },
  ], { onConflict: "employee_id" });
  if (xpError) {
    throw new Error(`Unable to seed employee XP: ${xpError.message}`);
  }

  await adminClient.storage.from("policy-documents").upload(policyDocumentAPath, new Blob([`${MARKER} A`]), {
    contentType: "text/plain",
    upsert: true,
  });
  await adminClient.storage.from("policy-documents").upload(policyDocumentBPath, new Blob([`${MARKER} B`]), {
    contentType: "text/plain",
    upsert: true,
  });
  await adminClient.storage.from("certificates").upload(certificateAPath, new Blob(["%PDF-1.4\n%"], { type: "application/pdf" }), {
    contentType: "application/pdf",
    upsert: true,
  });
  await adminClient.storage.from("certificates").upload(certificateBPath, new Blob(["%PDF-1.4\n%"], { type: "application/pdf" }), {
    contentType: "application/pdf",
    upsert: true,
  });

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
    certificateBPath,
    policyDocumentBPath,
    questionAId,
    scenarioAId,
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

function allowsRead(singleResult) {
  return Boolean(singleResult.data) && !singleResult.error;
}

function deniesRead(singleResult) {
  return Boolean(singleResult.error) || !singleResult.data;
}

function deniesWrite(result) {
  return Boolean(result.error) || !(result.data && result.data.length > 0);
}

async function runMatrix(clients, ids, report, adminClient) {
  const t1 = await clients.employeeA.from("daily_missions").select("id").eq("id", ids.missionAId).maybeSingle();
  appendResult(report, "checks", "TEST 1 Employee A -> Company A mission", allowsRead(t1), t1.error?.message ?? "ok");

  const t2 = await clients.employeeA.from("daily_missions").select("id").eq("id", ids.missionBId).maybeSingle();
  appendResult(report, "checks", "TEST 2 Employee A -> Company B mission", deniesRead(t2), t2.error?.message ?? "denied by RLS");

  const t3 = await clients.adminA.from("profiles").select("id").eq("company_id", ids.companyA).limit(1);
  appendResult(report, "checks", "TEST 3 Admin A -> Company A employees", (t3.data ?? []).length > 0 && !t3.error, t3.error?.message ?? "ok");

  const t4 = await clients.adminA.from("profiles").select("id").eq("company_id", ids.companyB).limit(1);
  appendResult(report, "checks", "TEST 4 Admin A -> Company B employees", (t4.data ?? []).length === 0 || Boolean(t4.error), t4.error?.message ?? "denied by RLS");

  const t5 = await clients.employeeA.from("policies").select("id").eq("id", ids.policyBId).maybeSingle();
  appendResult(report, "checks", "TEST 5 Employee A -> Company B policy", deniesRead(t5), t5.error?.message ?? "denied by RLS");

  const t6 = await clients.employeeA.from("certificates").select("id").eq("id", ids.certificateBId).maybeSingle();
  appendResult(report, "checks", "TEST 6 Employee A -> Company B certificate", deniesRead(t6), t6.error?.message ?? "denied by RLS");

  const t7 = await clients.adminA.from("campaigns").select("id").eq("id", ids.campaignBId).maybeSingle();
  appendResult(report, "checks", "TEST 7 Admin A -> Company B campaign", deniesRead(t7), t7.error?.message ?? "denied by RLS");

  const t8 = await clients.adminA.from("campaigns").select("id").eq("id", ids.campaignAId).maybeSingle();
  appendResult(report, "checks", "TEST 8 Admin A -> Company A campaign", allowsRead(t8), t8.error?.message ?? "ok");

  const t9 = await clients.employeeA
    .from("profiles")
    .update({ job_title: "Updated by employee RLS test" })
    .eq("id", ids.employeeA)
    .select("id, job_title");
  appendResult(report, "checks", "TEST 9 Employee A updates allowed profile field", Boolean(t9.data?.[0]?.job_title) && !t9.error, t9.error?.message ?? "allowed update failed");

  const t10 = await clients.employeeA
    .from("profiles")
    .update({ company_id: ids.companyB })
    .eq("id", ids.employeeA)
    .select("id");
  appendResult(report, "checks", "TEST 10 Employee A modify company_id", deniesWrite(t10), t10.error?.message ?? "write denied");

  const t11 = await clients.employeeA
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", ids.employeeA)
    .select("id");
  appendResult(report, "checks", "TEST 11 Employee A change role", deniesWrite(t11), t11.error?.message ?? "write denied");

  const t12 = await clients.employeeA
    .from("profiles")
    .update({ id: randomUUID() })
    .eq("id", ids.employeeA)
    .select("id");
  appendResult(report, "checks", "TEST 12 Employee A modify own profile id", deniesWrite(t12), t12.error?.message ?? "write denied");

  const t13 = await clients.employeeA
    .from("profiles")
    .update({ job_title: "Unauthorized cross-company update" })
    .eq("id", ids.employeeB)
    .select("id");
  appendResult(report, "checks", "TEST 13 Employee A modify Employee B profile", deniesWrite(t13), t13.error?.message ?? "write denied");

  const t14 = await clients.adminA
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", ids.adminA)
    .select("id");
  appendResult(report, "checks", "TEST 14 Admin A cannot change own role", deniesWrite(t14), t14.error?.message ?? "write denied");

  const t15 = await clients.adminA
    .from("profiles")
    .update({ company_id: ids.companyB })
    .eq("id", ids.adminA)
    .select("id");
  appendResult(report, "checks", "TEST 15 Admin A cannot change own company_id", deniesWrite(t15), t15.error?.message ?? "write denied");

  const t16 = await clients.adminA
    .from("profiles")
    .update({ id: randomUUID() })
    .eq("id", ids.adminA)
    .select("id");
  appendResult(report, "checks", "TEST 16 Admin A cannot change own profile id", deniesWrite(t16), t16.error?.message ?? "write denied");

  const t17 = await clients.adminA
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", ids.employeeA)
    .select("id, role");
  appendResult(report, "checks", "TEST 17 Company admin updates managed employee role", t17.data?.[0]?.role === "admin" && !t17.error, t17.error?.message ?? "admin update failed");

  const t18 = await adminClient
    .from("profiles")
    .update({ role: "employee" })
    .eq("id", ids.employeeA)
    .select("id, role");
  appendResult(report, "checks", "TEST 18 Service role updates profile authorization field", t18.data?.[0]?.role === "employee" && !t18.error, t18.error?.message ?? "service-role update failed");

  const t19 = await clients.employeeA
    .from("employee_xp")
    .update({ total_xp: 99999 })
    .eq("employee_id", ids.employeeA)
    .select("employee_id");
  appendResult(report, "checks", "TEST 19 Employee A modify XP", deniesWrite(t19), t19.error?.message ?? "write denied");

  const t20 = await clients.employeeA
    .from("mission_progress")
    .update({ status: "completed" })
    .eq("mission_id", ids.missionAId)
    .eq("employee_id", ids.employeeA)
    .select("mission_id");
  appendResult(report, "checks", "TEST 20 Employee A fake mission completion", deniesWrite(t20), t20.error?.message ?? "write denied");

  const t21 = await clients.employeeA
    .from("notifications")
    .select("id")
    .eq("company_id", ids.companyB)
    .limit(1);
  appendResult(report, "checks", "TEST 21 Employee A read Company B notifications", (t21.data ?? []).length === 0 || Boolean(t21.error), t21.error?.message ?? "denied by RLS");

  const t22 = await clients.employeeA.storage.from("certificates").createSignedUrl(ids.certificateBPath, 60);
  appendResult(report, "checks", "TEST 22 Company A principal access Company B storage object", Boolean(t22.error), t22.error?.message ?? "denied expected");

  const t23 = await clients.adminA.storage.from("certificates").createSignedUrl(ids.certificateBPath, 60);
  appendResult(report, "checks", "TEST 23 Admin A access Company B certificate download", Boolean(t23.error), t23.error?.message ?? "denied expected");
}

async function runIdorTests(clients, ids, report) {
  const probes = [
    {
      name: "IDOR employee id",
      query: () => clients.employeeA.from("profiles").select("id").eq("id", ids.employeeB).maybeSingle(),
    },
    {
      name: "IDOR campaign id",
      query: () => clients.employeeA.from("campaigns").select("id").eq("id", ids.campaignBId).maybeSingle(),
    },
    {
      name: "IDOR policy id",
      query: () => clients.employeeA.from("policies").select("id").eq("id", ids.policyBId).maybeSingle(),
    },
    {
      name: "IDOR certificate id",
      query: () => clients.employeeA.from("certificates").select("id").eq("id", ids.certificateBId).maybeSingle(),
    },
    {
      name: "IDOR document id",
      query: () => clients.employeeA.from("policy_documents").select("id").eq("id", ids.documentBId).maybeSingle(),
    },
    {
      name: "IDOR mission id",
      query: () => clients.employeeA.from("daily_missions").select("id").eq("id", ids.missionBId).maybeSingle(),
    },
  ];

  for (const probe of probes) {
    const result = await probe.query();
    appendResult(report, "idor", probe.name, deniesRead(result), result.error?.message ?? "denied by RLS");
  }
}

async function cleanup(adminClient, ids) {
  await adminClient.from("scenario_answers").delete().eq("company_id", ids.companyA);
  await adminClient.from("scenario_answers").delete().eq("company_id", ids.companyB);
  await adminClient.from("quiz_answers").delete().eq("company_id", ids.companyA);
  await adminClient.from("quiz_answers").delete().eq("company_id", ids.companyB);
  await adminClient.from("mission_progress").delete().in("mission_id", [ids.missionAId, ids.missionBId]);
  await adminClient.from("daily_missions").delete().in("id", [ids.missionAId, ids.missionBId]);
  await adminClient.from("certificates").delete().in("id", [ids.certificateAId, ids.certificateBId]);
  await adminClient.from("policy_documents").delete().in("id", [ids.documentAId, ids.documentBId]);
  await adminClient.from("quiz_questions").delete().eq("id", ids.questionAId);
  await adminClient.from("scenarios").delete().eq("id", ids.scenarioAId);
  await adminClient.from("campaigns").delete().in("id", [ids.campaignAId, ids.campaignBId]);
  await adminClient.from("policies").delete().in("id", [ids.policyAId, ids.policyBId]);
  await adminClient.from("notifications").delete().like("title", `${MARKER}%`);

  await adminClient.storage.from("policy-documents").remove([ids.policyDocumentBPath]);
  await adminClient.storage.from("certificates").remove([ids.certificateBPath]);
}

async function main() {
  ensureSafeEnvironment();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }
  const password = process.env.SECURITY_TEST_PASSWORD ?? DEFAULT_PASSWORD;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const companyA = randomUUID();
  const companyB = randomUUID();
  await upsertCompany(adminClient, companyA, `${MARKER}_COMPANY_A_${Date.now()}`);
  await upsertCompany(adminClient, companyB, `${MARKER}_COMPANY_B_${Date.now()}`);

  const adminAEmail = `${MARKER.toLowerCase()}_admin_a_${Date.now()}@example.test`;
  const employeeAEmail = `${MARKER.toLowerCase()}_employee_a_${Date.now()}@example.test`;
  const adminBEmail = `${MARKER.toLowerCase()}_admin_b_${Date.now()}@example.test`;
  const employeeBEmail = `${MARKER.toLowerCase()}_employee_b_${Date.now()}@example.test`;

  const adminA = await getOrCreateAuthUser(adminClient, adminAEmail, password);
  const employeeA = await getOrCreateAuthUser(adminClient, employeeAEmail, password);
  const adminB = await getOrCreateAuthUser(adminClient, adminBEmail, password);
  const employeeB = await getOrCreateAuthUser(adminClient, employeeBEmail, password);

  await upsertProfile(adminClient, {
    id: adminA,
    company_id: companyA,
    email: adminAEmail,
    first_name: "SAFETYXP",
    last_name: "ADMIN_A",
    role: "admin",
    employee_number: `${MARKER}_ADMIN_A`,
  });
  await upsertProfile(adminClient, {
    id: employeeA,
    company_id: companyA,
    email: employeeAEmail,
    first_name: "SAFETYXP",
    last_name: "EMPLOYEE_A",
    role: "employee",
    employee_number: `${MARKER}_EMP_A`,
  });
  await upsertProfile(adminClient, {
    id: adminB,
    company_id: companyB,
    email: adminBEmail,
    first_name: "SAFETYXP",
    last_name: "ADMIN_B",
    role: "admin",
    employee_number: `${MARKER}_ADMIN_B`,
  });
  await upsertProfile(adminClient, {
    id: employeeB,
    company_id: companyB,
    email: employeeBEmail,
    first_name: "SAFETYXP",
    last_name: "EMPLOYEE_B",
    role: "employee",
    employee_number: `${MARKER}_EMP_B`,
  });

  const ids = await seedData(adminClient, { companyA, companyB, adminA, employeeA, adminB, employeeB });

  const employeeAClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const adminAClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const employeeSignIn = await employeeAClient.auth.signInWithPassword({ email: employeeAEmail, password });
  if (employeeSignIn.error) {
    throw new Error(`Employee A sign-in failed: ${employeeSignIn.error.message}`);
  }

  const adminSignIn = await adminAClient.auth.signInWithPassword({ email: adminAEmail, password });
  if (adminSignIn.error) {
    throw new Error(`Admin A sign-in failed: ${adminSignIn.error.message}`);
  }

  const report = createReportBucket();
  const matrixIds = { ...ids, companyA, companyB, adminA, employeeA, adminB, employeeB };

  await runMatrix({ employeeA: employeeAClient, adminA: adminAClient }, matrixIds, report, adminClient);
  await runIdorTests({ employeeA: employeeAClient }, matrixIds, report);

  const outputPath = "docs/security-live-rls-results.json";
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  const shouldCleanup = (process.env.SECURITY_TEST_CLEANUP ?? "").toLowerCase() === "true";
  if (shouldCleanup) {
    await cleanup(adminClient, matrixIds);
  }

  const summary = `Live RLS checks: ${report.passed} passed, ${report.failed} failed.`;
  console.log(summary);
  console.log(`Report written to ${outputPath}`);

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
