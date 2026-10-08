export type UserRole = "employee" | "admin" | "super_admin";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "basic" | "enterprise";
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  companyId: string;
  isActive: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
  company: Company;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
