import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentRole } from "@/lib/supabase/server";
import { getRedirectTargetForRole } from "@/lib/auth-utils";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const role = await getCurrentRole();
  redirect(getRedirectTargetForRole(role));
}
