"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AuthState, Company, User, UserRole } from "@/types/auth";

type ProfileRow = {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string | null;
  plan: "basic" | "enterprise" | null;
  isActive: boolean | null;
};

const initialAuthState: AuthState = {
  user: null,
  company: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
};

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  ...initialAuthState,
  signOut: async () => {
    throw new Error("Authentication is unavailable.");
  },
});

async function signOut() {
  const { error } = await supabaseBrowser.auth.signOut();

  if (error) {
    throw new Error("Sign out failed.");
  }
}

async function getSessionContext() {
  const {
    data: { session },
    error,
  } = await supabaseBrowser.auth.getSession();

  if (error || !session) {
    return {
      user: null,
      company: null,
      session: null,
      isAuthenticated: false,
    };
  }

  const { data: profileData } = await supabaseBrowser
    .from("profiles")
    .select("id, company_id, email, first_name, last_name, role")
    .eq("id", session.user.id)
    .maybeSingle<ProfileRow>();

  const profile = profileData;

  const user: User | null = profile
    ? {
        id: profile.id,
        email: profile.email,
        fullName: `${profile.first_name} ${profile.last_name}`.trim(),
        role: (profile.role as UserRole) ?? "employee",
        companyId: profile.company_id,
        isActive: true,
      }
    : {
        id: session.user.id,
        email: session.user.email ?? "",
        fullName: session.user.email ?? "User",
        role: "employee",
        companyId: "",
        isActive: true,
      };

  let company: Company | null = null;

  if (user?.companyId) {
    const { data: companyData } = await supabaseBrowser
      .from("companies")
      .select("id, name, slug, plan, isActive")
      .eq("id", user.companyId)
      .maybeSingle<CompanyRow>();

    const companyRecord = companyData;

    if (companyRecord) {
      company = {
        id: companyRecord.id,
        name: companyRecord.name,
        slug: companyRecord.slug ?? companyRecord.name.toLowerCase().replace(/\s+/g, "-"),
        plan: companyRecord.plan ?? "basic",
        isActive: companyRecord.isActive ?? true,
      };
    }
  }

  const normalizedSession: NonNullable<AuthState["session"]> = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: String(session.expires_at ?? ""),
    user,
    company,
  } as NonNullable<AuthState["session"]>;

  return {
    user,
    company,
    session: normalizedSession,
    isAuthenticated: Boolean(session),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const nextState = await getSessionContext();

      if (!isMounted) {
        return;
      }

      setAuthState({
        user: nextState.user,
        company: nextState.company,
        session: nextState.session,
        isAuthenticated: nextState.isAuthenticated,
        isLoading: false,
      });
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (_event, session) => {
      const nextState = session
        ? await getSessionContext()
        : {
            user: null,
            company: null,
            session: null,
            isAuthenticated: false,
          };

      if (isMounted) {
        setAuthState({
          user: nextState.user,
          company: nextState.company,
          session: nextState.session,
          isAuthenticated: nextState.isAuthenticated,
          isLoading: false,
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ ...authState, signOut }), [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
