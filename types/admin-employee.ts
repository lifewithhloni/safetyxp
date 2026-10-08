export type EmployeeListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  jobTitle: string | null;
  employeeNumber: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeDepartmentOption = {
  id: string;
  name: string;
};

export type EmployeeDetail = EmployeeListItem & {
  certificates: EmployeeCertificate[];
};

export type EmployeeCertificate = {
  id: string;
  campaignName: string | null;
  status: "eligible" | "generating" | "issued" | "expired" | "revoked" | "failed";
  issuedAt: string | null;
  expiresAt: string | null;
};
