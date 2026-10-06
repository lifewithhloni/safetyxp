"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

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

function BrandLockup({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          light ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/25" : "bg-[#e8fbf2] text-[#00a86b]"
        }`}
      >
        <ShieldCheck size={25} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span>
        <span className={`block text-[25px] font-extrabold leading-none tracking-tight ${light ? "text-white" : "text-[#102a43]"}`}>
          Safety<span className="text-[#00bf78]">XP</span>
        </span>
        <span className={`mt-1.5 block text-[8px] font-semibold uppercase tracking-[0.24em] ${light ? "text-slate-300" : "text-slate-500"}`}>
          Learn · Do · Stay safe · Earn
        </span>
      </span>
    </div>
  );
}

const benefits = [
  {
    icon: BookOpenCheck,
    title: "Practical Learning",
    description: "Short, interactive lessons",
  },
  {
    icon: ShieldCheck,
    title: "Real-World Safety",
    description: "Build safer habits at work",
  },
  {
    icon: Award,
    title: "Earn and Grow",
    description: "Collect XP, badges and certificates",
  },
  {
    icon: UsersRound,
    title: "For Your Team",
    description: "A safer workplace for everyone",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

          <div className="relative z-10">
            <BrandLockup light />
          </div>

          <div className="relative z-10 mt-4 max-w-[610px] sm:mt-8 lg:mt-12 xl:mt-14">
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

          <ul className="relative z-10 mt-8 hidden max-w-lg grid-cols-2 gap-x-5 gap-y-4 lg:grid xl:mt-10">
            {benefits.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-slate-950/25 text-[#00d084]">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white xl:text-sm">{title}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-300 xl:text-xs">{description}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="relative z-10 mt-7 hidden border-t border-white/15 pt-4 text-xs text-slate-300 lg:mt-auto lg:block lg:pt-5">
            Learning that helps people make safer decisions at work.
          </div>
        </section>

        <section className="flex min-w-0 flex-col bg-white px-5 py-6 sm:px-9 sm:py-8 lg:justify-center lg:px-10 lg:py-9 xl:px-14">
          <div className="flex items-center justify-end gap-1.5 text-xs sm:text-sm">
            <span className="text-slate-500">Need help?</span>
            <span className="font-semibold text-[#008f61]">Contact your company administrator</span>
          </div>

          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-7 mt-5 hidden justify-center lg:flex">
              <BrandLockup />
            </div>

            <div className="text-center">
              <h2 className="text-[30px] font-bold tracking-[-0.035em] text-[#102a43] sm:text-[34px]">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-slate-500 sm:text-[15px]">
                Sign in to continue your safety journey.
              </p>
            </div>

            <form className="mt-7 space-y-5 sm:mt-8" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-semibold text-[#172b43] sm:text-sm">
                  Email
                </label>
                <div className="relative">
                  <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#fbfcfd] pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#00ae70] focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-semibold text-[#172b43] sm:text-sm">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#fbfcfd] pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#00ae70] focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="rounded font-semibold text-[#009965] outline-none transition hover:text-[#007b52] focus-visible:ring-2 focus-visible:ring-[#00ae70] focus-visible:ring-offset-2">
                  Forgot password?
                </Link>
              </div>

              {error ? (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00b96b] to-[#00a968] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,169,104,0.2)] transition hover:from-[#00a963] hover:to-[#008f59] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading ? <ArrowRight size={18} aria-hidden="true" /> : null}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-[#e9fbf2] to-[#f2fcf7] p-4 sm:mt-7">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#008f61] shadow-sm">
                <BriefcaseBusiness size={17} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-bold text-[#123e33] sm:text-sm">Built for safer workplaces.</span>
                <span className="mt-1 block text-[11px] leading-4 text-slate-600 sm:text-xs sm:leading-5">
                  Your SafetyXP account gives you access to the learning and safety tools provided by your organisation.
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-[#e8f0f4] text-sm font-medium text-slate-500">
          Loading sign in...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
