"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
    });

    if (resetError) {
      setError("We could not send the recovery email. Please check the address and try again.");
      setIsLoading(false);
      return;
    }

    setMessage("A password reset email has been sent. Please check your inbox.");
    setIsLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3d91] text-white">
            <ShieldCheck size={22} />
          </div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-slate-900">Forgot password</h1>
        <p className="mt-2 text-center text-sm text-slate-600">Enter your email to receive a recovery link.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b3d91] focus:bg-white"
              placeholder="you@company.com"
              required
            />
          </div>

          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069] disabled:opacity-60">
            {isLoading ? "Sending..." : "Send reset link"}
          </button>

          <a href="/login" className="block text-center text-sm font-medium text-[#0b3d91]">Back to sign in</a>
        </form>
      </div>
    </main>
  );
}
