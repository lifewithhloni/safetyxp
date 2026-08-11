"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Company } from "@/types/auth";
import { mockCompany } from "@/services/auth.service";

interface WorkspaceContextValue {
  company: Company | null;
  setCompany: (company: Company | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  company: null,
  setCompany: () => undefined,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(mockCompany);

  const value = useMemo(() => ({ company, setCompany }), [company]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
