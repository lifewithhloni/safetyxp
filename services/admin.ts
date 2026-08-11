import type { ActivityItem, AdminNavItem, CampaignItem, MetricItem } from "@/types/admin";

export const adminNavigation: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", description: "Overview and performance", icon: "home" },
  { label: "Employees", href: "/admin/employees", description: "People and access", icon: "users" },
  { label: "Learning Campaigns", href: "/admin/learning-campaigns", description: "Training programs", icon: "campaigns" },
  { label: "Policies", href: "/admin/policies", description: "Governance content", icon: "policies" },
  { label: "Reports", href: "/admin/reports", description: "Insights and analytics", icon: "reports" },
  { label: "Certificates", href: "/admin/certificates", description: "Issued credentials", icon: "certificates" },
  { label: "Settings", href: "/admin/settings", description: "Workspace preferences", icon: "settings" },
];

export const adminMetrics: MetricItem[] = [
  {
    title: "Active Campaigns",
    value: "12",
    change: "+3 this month",
    description: "Live learning initiatives",
    trend: "up",
  },
  {
    title: "Employees",
    value: "2,184",
    change: "+86 today",
    description: "Registered and active",
    trend: "up",
  },
  {
    title: "Completion Rate",
    value: "96%",
    change: "+4.2%",
    description: "Average campaign completion",
    trend: "up",
  },
  {
    title: "Certificates Issued",
    value: "1,482",
    change: "-1 pending",
    description: "Issued this quarter",
    trend: "neutral",
  },
];

export const recentActivity: ActivityItem[] = [
  { title: "Quarterly PPE refresh assigned", subtitle: "Operations team", meta: "12 mins ago" },
  { title: "2 new managers added", subtitle: "HR administration", meta: "1 hour ago" },
  { title: "Compliance report exported", subtitle: "Safety reports", meta: "Today" },
];

export const upcomingDeadlines: ActivityItem[] = [
  { title: "Fire Safety campaign closes", subtitle: "Due Friday • 5:00 PM", meta: "2 days" },
  { title: "ERGONOMICS review", subtitle: "Stakeholder approval", meta: "4 days" },
  { title: "Policy reaffirmation", subtitle: "Pending sign-off", meta: "6 days" },
];

export const currentCampaigns: CampaignItem[] = [
  { title: "Incident Response Basics", owner: "Alicia Moore", progress: 78, dueDate: "Aug 16" },
  { title: "Warehouse Safety Refresh", owner: "Darren Cole", progress: 64, dueDate: "Aug 21" },
  { title: "Leadership Compliance", owner: "Mina Lewis", progress: 51, dueDate: "Sep 02" },
];
