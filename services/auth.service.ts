import type { ProfileData } from "@/types";
import type { Company, Session, User } from "@/types/auth";

export const mockCompany: Company = {
  id: "company_01",
  name: "Northwind Safety",
  slug: "northwind-safety",
  plan: "enterprise",
  isActive: true,
};

export const mockUser: User = {
  id: "user_01",
  email: "maya.chen@northwind-safety.com",
  fullName: "Maya Chen",
  role: "admin",
  companyId: mockCompany.id,
  isActive: true,
};

export const mockSession: Session = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: mockUser,
  company: mockCompany,
  expiresAt: "2099-01-01T00:00:00.000Z",
};

export async function getMockSession(): Promise<Session> {
  return mockSession;
}

export async function getMockUser(): Promise<User> {
  return mockUser;
}

export async function getMockCompany(): Promise<Company> {
  return mockCompany;
}

export function getCurrentUser(): ProfileData {
  return {
    name: "Maya Chen",
    department: "Operations",
    manager: "Nadia Brooks",
    compliance: "Compliant",
    level: 12,
    achievements: ["Safety Champion", "Rapid Responder", "Streak 18 days"],
  };
}
