"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

export default function ResetPasswordForm({ invitationId }: { invitationId: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });

    if (updateError) {
      setError("This reset link may be invalid or expired. Please request a new one.");
      setIsLoading(false);
      return;
    }

    if (invitationId) {
      try {
        const response = await fetch("/api/employee-invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        });
        if (!response.ok) {
          setError("Your password was updated, but this invitation could not be activated. Please retry or contact your company administrator.");
          setIsLoading(false);
          return;
        }
      } catch {
        setError("Your password was updated, but this invitation could not be activated. Please retry or contact your company administrator.");
        setIsLoading(false);
        return;
      }
    }

    setMessage(invitationId
      ? "Your password is set. Redirecting to sign in..."
      : "Your password has been updated. Redirecting to sign in...");
    setIsLoading(false);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b3d91] text-white">
            <ShieldCheck size={22} />
          </div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-slate-900">
          {invitationId ? "Set your password" : "Reset password"}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">Create a new password for your account.</p>

        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>At least 8 characters</li>
          <li>Use a unique password</li>
        </ul>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b3d91] focus:bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b3d91] focus:bg-white"
              required
            />
          </div>

          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069] disabled:opacity-60">
            {isLoading ? "Updating..." : invitationId ? "Set password" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
