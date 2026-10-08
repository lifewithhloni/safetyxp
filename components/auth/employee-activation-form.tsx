"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

const invalidInvitationMessage =
  "This invitation link is invalid or has expired. Please ask your company administrator to send you a new invitation.";
const activationErrorMessage =
  "We couldn't activate your invitation. Please contact your company administrator.";

type ActivationRouter = {
  push: (path: string) => void;
  refresh: () => void;
};

export type ActivationDependencies = {
  verifyOtp: (tokenHash: string) => Promise<{ data: { user: unknown | null }; error: unknown | null }>;
  updatePassword: (password: string) => Promise<{ error: unknown | null }>;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
  setError: (message: string | null) => void;
  onSuccess: () => void;
  navigateHome: (delayMs: number) => void;
};

export async function submitEmployeeActivation({
  invitationId,
  tokenHash,
  password,
  confirmPassword,
  dependencies,
}: {
  invitationId: string | null;
  tokenHash: string | null;
  password: string;
  confirmPassword: string;
  dependencies: ActivationDependencies;
}) {
  dependencies.setError(null);

  if (!invitationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    dependencies.setError(invalidInvitationMessage);
    return false;
  }
  if (!tokenHash?.trim()) {
    dependencies.setError(invalidInvitationMessage);
    return false;
  }
  if (password.length < 8) {
    dependencies.setError("Password must be at least 8 characters long.");
    return false;
  }
  if (password !== confirmPassword) {
    dependencies.setError("Passwords do not match.");
    return false;
  }

  let verification: Awaited<ReturnType<ActivationDependencies["verifyOtp"]>>;
  try {
    verification = await dependencies.verifyOtp(tokenHash.trim());
  } catch {
    dependencies.setError(invalidInvitationMessage);
    return false;
  }
  if (verification.error || !verification.data.user) {
    dependencies.setError(invalidInvitationMessage);
    return false;
  }

  try {
    const { error } = await dependencies.updatePassword(password);
    if (error) {
      dependencies.setError("We couldn't finish creating your password. Please try again.");
      return false;
    }
  } catch {
    dependencies.setError("We couldn't finish creating your password. Please try again.");
    return false;
  }

  try {
    if (!await dependencies.acceptInvitation(invitationId)) {
      dependencies.setError(activationErrorMessage);
      return false;
    }
  } catch {
    dependencies.setError(activationErrorMessage);
    return false;
  }

  dependencies.onSuccess();
  dependencies.navigateHome(1300);
  return true;
}

export function scheduleActivationRedirect(
  router: ActivationRouter,
  schedule: (callback: () => void, delayMs: number) => unknown,
  delayMs = 1300
) {
  schedule(() => {
    router.push("/");
    router.refresh();
  }, delayMs);
}

export function EmployeeActivationSuccess() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-success-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071c2b]/65 px-4 py-8 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#00a86b]">
          <CheckCircle2 size={38} aria-hidden="true" />
        </span>
        <h2 id="activation-success-title" className="mt-5 text-2xl font-bold tracking-tight text-[#102a43]">
          Your account has been created
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {"You're now signed in to SafetyXP. Let's get you started."}
        </p>
        <p className="mt-5 text-xs font-medium text-slate-500">
          Taking you to your safety dashboard...
        </p>
      </div>
    </div>
  );
}

export default function EmployeeActivationForm({
  invitationId,
  tokenHash,
}: {
  invitationId: string | null;
  tokenHash: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      await submitEmployeeActivation({
        invitationId,
        tokenHash,
        password,
        confirmPassword,
        dependencies: {
          verifyOtp: (token_hash) => supabaseBrowser.auth.verifyOtp({ type: "invite", token_hash }),
          updatePassword: (newPassword) => supabaseBrowser.auth.updateUser({ password: newPassword }),
          acceptInvitation: async (id) => {
            const response = await fetch("/api/employee-invitations/accept", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ invitationId: id }),
            });
            return response.ok;
          },
          setError,
          onSuccess: () => setIsSuccess(true),
          navigateHome: (delayMs) => scheduleActivationRedirect(
            router,
            (callback, delay) => window.setTimeout(callback, delay),
            delayMs
          ),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#e8f0f4] md:flex md:items-center md:justify-center md:p-4 xl:p-6">
      <div className="mx-auto grid min-h-svh w-full max-w-[1500px] overflow-hidden bg-white shadow-[0_30px_90px_rgba(7,28,43,0.22)] md:min-h-[calc(100svh-2rem)] md:rounded-[26px] lg:grid-cols-[1.08fr_0.92fr] xl:min-h-[calc(100svh-3rem)]">
        <section className="relative isolate flex min-h-[190px] flex-col overflow-hidden bg-[#071c2b] px-5 py-5 text-white sm:min-h-[220px] sm:px-8 lg:min-h-0 lg:px-10 lg:py-9 xl:px-12">
          <Image
            src="/assets/images/safetyxp-team.png"
            alt="SafetyXP team members learning together in a workplace safety setting"
            fill
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="absolute inset-0 -z-20 object-cover object-[center_45%] lg:object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#061925]/90 via-[#071c2b]/55 to-[#061925]/90 lg:bg-gradient-to-r lg:from-[#061925]/95 lg:via-[#071c2b]/75 lg:to-[#071c2b]/25" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/25">
              <ShieldCheck size={25} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[25px] font-extrabold leading-none tracking-tight text-white">
                Safety<span className="text-[#00bf78]">XP</span>
              </span>
              <span className="mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                Learn · Do · Stay safe · Earn
              </span>
            </span>
          </div>
          <div className="relative z-10 mt-8 max-w-xl lg:mt-auto lg:mb-16">
            <h1 className="text-[clamp(1.8rem,4.7vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-white">
              Safer People.
              <br />
              Stronger
              <br />
              <span className="text-[#00d084]">Workplaces.</span>
            </h1>
            <p className="mt-4 hidden max-w-md text-sm leading-6 text-slate-200 sm:block sm:text-base">
              Learn, complete missions, earn XP and help build a safer tomorrow.
            </p>
          </div>
        </section>

        <section className="flex min-w-0 flex-col justify-center bg-white px-5 py-8 sm:px-9 sm:py-10 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold text-[#102a43] lg:hidden">
              <ShieldCheck size={21} className="text-[#00a86b]" aria-hidden="true" />
              Safety<span className="text-[#00a86b]">XP</span>
            </div>
            <div className="text-center">
              <h2 className="text-[30px] font-bold tracking-[-0.035em] text-[#102a43] sm:text-[34px]">
                Create your password
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">
                Your SafetyXP account is ready. Create your password to get started.
              </p>
            </div>

            <ul className="mt-6 space-y-2 rounded-2xl border border-emerald-100 bg-[#f2fcf7] p-4 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-[#00a86b]" aria-hidden="true" />
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-[#00a86b]" aria-hidden="true" />
                Use a unique password
              </li>
            </ul>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="new-password" className="mb-2 block text-xs font-semibold text-[#172b43] sm:text-sm">
                  New password
                </label>
                <div className="relative">
                  <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#fbfcfd] pl-11 pr-4 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-[#00ae70] focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold text-[#172b43] sm:text-sm">
                  Confirm password
                </label>
                <div className="relative">
                  <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#fbfcfd] pl-11 pr-4 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-[#00ae70] focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    required
                  />
                </div>
              </div>

              {error ? (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00b96b] to-[#00a968] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,169,104,0.2)] transition hover:from-[#00a963] hover:to-[#008f59] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoading ? "Creating your account..." : "Create account"}
              </button>
            </form>
          </div>
        </section>
      </div>
      {isSuccess ? <EmployeeActivationSuccess /> : null}
    </main>
  );
}
