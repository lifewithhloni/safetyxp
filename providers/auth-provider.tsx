"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMockSession } from "@/services/auth.service";
import type { AuthState, Session } from "@/types/auth";

const initialAuthState: AuthState = {
  user: null,
  company: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
};

const AuthContext = createContext<AuthState>(initialAuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    async function loadSession() {
      const session = await getMockSession();
      setAuthState({
        user: session.user,
        company: session.company,
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    }

    void loadSession();
  }, []);

  const value = useMemo(() => authState, [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
