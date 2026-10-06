"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

type LoginResult = {
  data: { user: unknown | null };
  error: unknown | null;
};

export function getLoginRedirect(searchParams: Pick<URLSearchParams, "get">) {
  return searchParams.get("redirect") || "/today";
}

export async function submitLogin({
  signIn,
  redirectTo,
  router,
  setError,
  setIsLoading,
}: {
  signIn: () => Promise<LoginResult>;
  redirectTo: string;
  router: { push: (path: string) => void; refresh: () => void };
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}) {
  setIsLoading(true);
  setError(null);

  try {
    const { data, error: signInError } = await signIn();

    if (signInError || !data.user) {
      setError("Your email or password is incorrect. Please try again.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  } catch {
    setError("Unable to sign in right now. Please try again.");
  } finally {
    setIsLoading(false);
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const redirectTo = getLoginRedirect(searchParams);

    await submitLogin({
      signIn: () => supabaseBrowser.auth.signInWithPassword({ email, password }),
      redirectTo,
      router,
      setError,
      setIsLoading,
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3d91] text-white">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#1565c0]">SafetyXP</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to your company workspace.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b3d91] focus:bg-white"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b3d91] focus:bg-white"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Remember me
            </label>
            <a href="/forgot-password" className="font-medium text-[#0b3d91] hover:text-[#083069]">Forgot Password?</a>
          </div>

          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
          Microsoft sign-in is coming soon.
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-slate-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
