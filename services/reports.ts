import type {
  KpiItem,
  DepartmentPerformance,
  CampaignPerformance,
  AttentionEmployee,
  CertificateStatus,
  AIInsight,
  ForecastPoint,
  AuditMetric,
  ReportFilters,
  ReportDateRange,
  ReportStatus,
} from "@/types/reports";

export const reportDateRanges: ReportDateRange[] = ["Last 7 days", "Last 30 days", "Quarter to date", "Last quarter"];

export const reportStatuses: ReportStatus[] = ["All", "Compliant", "At Risk", "Overdue", "Not Started"];

export const reportFilterOptions = {
  dateRanges: reportDateRanges,
  campaigns: ["All campaigns", "Working at Heights", "Fire Safety", "Equipment Safety", "Policy Awareness", "Hazard Recognition"],
  departments: ["All departments", "Operations", "Engineering", "Warehouse", "Finance", "HR", "Construction"],
  locations: ["All locations", "Johannesburg", "Cape Town", "Durban", "Pretoria", "Gqeberha"],
  managers: ["All managers", "Nadia Brooks", "Rafael Gomez", "Darren Cole", "Mina Lewis", "Tendai Moyo"],
  employees: ["All employees", "Thabo Maseko", "Ava Johnson", "Liam Patel", "Sarah Mokoena", "Noah Mbatha", "Priya Singh"],
  statuses: reportStatuses,
};

export const defaultReportFilters: ReportFilters = {
  dateRange: "Last 30 days",
  campaign: "All campaigns",
  department: "All departments",
  location: "All locations",
  manager: "All managers",
  employee: "All employees",
  status: "All",
};

export const reportKpis: KpiItem[] = [
  { title: "Overall Compliance", value: "92%", change: "+6%", description: "Current organisation compliance", trend: "up" },
  { title: "Employees Compliant", value: "814", change: "+14", description: "Employees meeting all required courses", trend: "up" },
  { title: "Employees At Risk", value: "34", change: "-4", description: "Employees requiring intervention", trend: "down" },
  { title: "Active Campaigns", value: "8", change: "+2", description: "Campaigns currently running", trend: "up" },
  { title: "Certificates Issued", value: "1,264", change: "+82", description: "Issued this period", trend: "up" },
  { title: "Certificates Expiring", value: "18", change: "+3", description: "Certificates due to expire soon", trend: "neutral" },
];

export const complianceOverview = {
  compliance: 92,
  trend: 6,
  target: 95,
  narrative: "Current compliance is strong, but the organisation needs a small lift to reach the 95% target.",
};

export const departmentPerformance: DepartmentPerformance[] = [
  { id: "dept-ops", name: "Operations", compliance: 92, employees: 248, campaignStatus: "Behind", riskLevel: "Medium" },
  { id: "dept-eng", name: "Engineering", compliance: 96, employees: 184, campaignStatus: "On track", riskLevel: "Low" },
  { id: "dept-wh", name: "Warehouse", compliance: 84, employees: 158, campaignStatus: "At risk", riskLevel: "High" },
  { id: "dept-fin", name: "Finance", compliance: 99, employees: 72, campaignStatus: "Compliant", riskLevel: "Low" },
  { id: "dept-hr", name: "HR", compliance: 100, employees: 54, campaignStatus: "Compliant", riskLevel: "Low" },
  { id: "dept-con", name: "Construction", compliance: 89, employees: 136, campaignStatus: "At risk", riskLevel: "Medium" },
];

export const campaignPerformance: CampaignPerformance[] = [
  { id: "camp-001", campaign: "Working at Heights", completion: 58, employees: 142, deadline: "Sep 4", risk: "High", nextAction: "Extend campaign by 3 days" },
  { id: "camp-002", campaign: "Fire Safety", completion: 82, employees: 238, deadline: "Aug 30", risk: "Medium", nextAction: "Send targeted reminders" },
  { id: "camp-003", campaign: "Equipment Safety", completion: 95, employees: 104, deadline: "Sep 12", risk: "Low", nextAction: "Maintain momentum" },
  { id: "camp-004", campaign: "Hazard Recognition", completion: 67, employees: 172, deadline: "Sep 8", risk: "High", nextAction: "Assign team coaches" },
];

export const attentionEmployees: AttentionEmployee[] = [
  { id: "att-001", employee: "Thabo Maseko", department: "Warehouse", reason: "Low participation in fire safety", action: "Send reminder", status: "At Risk" },
  { id: "att-002", employee: "Ava Johnson", department: "Operations", reason: "Working at Heights overdue", action: "Schedule check-in", status: "Overdue" },
  { id: "att-003", employee: "Liam Patel", department: "Engineering", reason: "Late scenario completion", action: "Review progress", status: "Needs Review" },
  { id: "att-004", employee: "Sarah Mokoena", department: "Warehouse", reason: "Campaign completion slowed", action: "Notify manager", status: "At Risk" },
];

export const certificateStatus: CertificateStatus[] = [
  { id: "cert-week", title: "Expiring This Week", count: 8, hint: "Prioritise fast-moving teams", urgency: "high" },
  { id: "cert-month", title: "Expiring This Month", count: 42, hint: "Plan renewals with managers", urgency: "medium" },
  { id: "cert-expired", title: "Expired", count: 12, hint: "Reassign training immediately", urgency: "high" },
];

export const aiInsights: AIInsight[] = [
  { id: "insight-1", summary: "Compliance is expected to drop below 90% next week because the Working at Heights campaign has low participation.", recommendation: "Send reminders to Warehouse and extend Working at Heights by three days." },
  { id: "insight-2", summary: "Warehouse employees are taking twice as long to complete learning compared to Engineering.", recommendation: "Deploy peer coaching and track completion more closely." },
  { id: "insight-3", summary: "Fire Safety campaign has a predicted completion rate of 98%.", recommendation: "Notify the Operations Manager and keep current cadence." },
  { id: "insight-4", summary: "Construction department has the highest overdue training volume.", recommendation: "Assign a dedicated compliance specialist for Construction." },
];

export const forecastPoints: ForecastPoint[] = [
  { label: "Today", compliance: 92 },
  { label: "+5d", compliance: 91 },
  { label: "+10d", compliance: 90 },
  { label: "+15d", compliance: 91 },
  { label: "+20d", compliance: 92 },
  { label: "+25d", compliance: 93 },
  { label: "+30d", compliance: 94 },
];

export const auditMetrics: AuditMetric[] = [
  { id: "audit-1", label: "Policies Published", value: "78", description: "Active compliance policies" },
  { id: "audit-2", label: "Certificates Valid", value: "1,198", description: "Valid credentials across teams" },
  { id: "audit-3", label: "Outstanding Training", value: "42", description: "Employees with overdue modules" },
  { id: "audit-4", label: "Audit Score", value: "96%", description: "Current audit readiness" },
];

export function filterReportItems<T extends { id: string }>(items: T[], filters: ReportFilters, key: keyof T | null = null) {
  if (filters.status === "All" && filters.department === "All departments" && filters.campaign === "All campaigns" && filters.location === "All locations" && filters.manager === "All managers" && filters.employee === "All employees") {
    return items;
  }

  return items.filter((item) => {
    if (filters.department !== "All departments" && key === "department" && (item as any)["department"] !== filters.department) {
      return false;
    }

    if (filters.campaign !== "All campaigns" && key === "campaign" && (item as any)["campaign"] !== filters.campaign) {
      return false;
    }

    if (filters.location !== "All locations" && key === "location" && (item as any)["location"] !== filters.location) {
      return false;
    }

    if (filters.manager !== "All managers" && key === "manager" && (item as any)["manager"] !== filters.manager) {
      return false;
    }

    if (filters.employee !== "All employees" && key === "employee" && (item as any)["employee"] !== filters.employee) {
      return false;
    }

    if (filters.status !== "All" && key === "status" && (item as any)["status"] !== filters.status) {
      return false;
    }

    return true;
  });
}
