import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as nextEnv from "@next/env";

type ProvisioningModule = typeof import("@/services/provisioning/company-provisioning.service");

type CliArgs = Record<string, string>;

function getProjectRoot() {
  // Resolve project root relative to this script file, not process.cwd().
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function loadProjectEnv() {
  const projectRoot = getProjectRoot();
  nextEnv.loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production");
  return projectRoot;
}

async function loadProvisioningModule(): Promise<ProvisioningModule> {
  return import("@/services/provisioning/company-provisioning.service");
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (const entry of argv) {
    if (!entry.startsWith("--")) {
      continue;
    }

    const [key, ...rest] = entry.slice(2).split("=");
    const value = rest.join("=").replace(/^['\"]|['\"]$/g, "");
    args[key] = value;
  }

  return args;
}

async function promptForMissingValues(initial: CliArgs) {
  const rl = readline.createInterface({ input, output });

  const ask = async (label: string, currentValue = "") => {
    if (currentValue.trim()) {
      return currentValue.trim();
    }

    const answer = await rl.question(`${label}: `);
    return answer.trim();
  };

  const companyName = await ask("Company name", initial.company ?? initial.companyName ?? "");
  const industry = await ask("Industry", initial.industry ?? "");
  const adminFirstName = await ask("Admin first name", initial.adminFirstName ?? "");
  const adminLastName = await ask("Admin last name", initial.adminLastName ?? "");
  const adminEmail = await ask("Admin email", initial.adminEmail ?? "");
  const timezone = await ask("Timezone", initial.timezone ?? "UTC");
  const logoUrl = await ask("Company logo URL (optional)", initial.logoUrl ?? "");

  console.log();
  console.log("Confirm provisioning:");
  console.log(`Company: ${companyName}`);
  console.log(`Admin: ${adminFirstName} ${adminLastName}`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Timezone: ${timezone}`);

  const confirm = await ask("Create company? (yes/no)", "yes");
  await rl.close();

  if (!/^y(es)?$/i.test(confirm)) {
    throw new Error("Provisioning cancelled.");
  }

  return {
    companyName,
    industry,
    adminFirstName,
    adminLastName,
    adminEmail,
    timezone,
    logoUrl: logoUrl || undefined,
  };
}

async function main() {
  loadProjectEnv();
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.checkEnv === "true" || parsed["check-env"] === "true") {
    const hasSupabaseUrl = Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim());
    const hasSecretKey = Boolean((process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim());
    console.log(`ENV_LOADED=${hasSupabaseUrl || hasSecretKey}`);
    console.log(`NEXT_PUBLIC_SUPABASE_URL_DETECTED=${hasSupabaseUrl}`);
    console.log(`SUPABASE_SECRET_KEY_DETECTED=${hasSecretKey}`);
    return;
  }

  const { provisionCompanyWithAdmin, validateProvisioningInput } = await loadProvisioningModule();
  const input = await promptForMissingValues(parsed);
  const validation = validateProvisioningInput(input);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const result = await provisionCompanyWithAdmin(validation.value);

  console.log("Provisioning completed successfully.");
  console.log(`Company: ${result.company.name} (${result.company.id})`);
  console.log(`Admin: ${result.admin.firstName} ${result.admin.lastName} <${result.admin.email}>`);
  console.log(`Admin role: ${result.admin.role}`);
  console.log(`Admin invitation sent: ${result.invitation.emailSent ? "yes" : "no"}`);
  console.log(`Company reused: ${result.company.created ? "no" : "yes"}`);
}

function isEntryPoint() {
  if (!process.argv[1]) {
    return false;
  }

  return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isEntryPoint()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Provisioning failed.";
    console.error(message);
    process.exitCode = 1;
  });
}