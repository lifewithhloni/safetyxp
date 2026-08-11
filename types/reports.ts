export type ReportDateRange = "Last 7 days" | "Last 30 days" | "Quarter to date" | "Last quarter";

export type ReportStatus = "All" | "Compliant" | "At Risk" | "Overdue" | "Not Started";

export type ReportFilters = {
  dateRange: ReportDateRange;
  campaign: string;
  department: string;
  location: string;
  manager: string;
  employee: string;
  status: ReportStatus;
};

export type KpiItem = {
  title: string;
  value: string;
  change: string;
  description: string;
  trend: "up" | "down" | "neutral";
};

export type DepartmentPerformance = {
  id: string;
  name: string;
  compliance: number;
  employees: number;
  campaignStatus: string;
  riskLevel: "Low" | "Medium" | "High";
};

export type CampaignPerformance = {
  id: string;
  campaign: string;
  completion: number;
  employees: number;
  deadline: string;
  risk: "Low" | "Medium" | "High";
  nextAction: string;
};

export type AttentionEmployee = {
  id: string;
  employee: string;
  department: string;
  reason: string;
  action: string;
  status: "At Risk" | "Overdue" | "Needs Review";
};

export type CertificateStatus = {
  id: string;
  title: string;
  count: number;
  hint: string;
  urgency: "high" | "medium" | "low";
};

export type AIInsight = {
  id: string;
  summary: string;
  recommendation: string;
};

export type ForecastPoint = {
  label: string;
  compliance: number;
};

export type AuditMetric = {
  id: string;
  label: string;
  value: string;
  description: string;
};
