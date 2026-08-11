export interface AdminNavItem {
  label: string;
  href: string;
  description: string;
  icon: "home" | "users" | "campaigns" | "policies" | "reports" | "certificates" | "settings";
}

export interface MetricItem {
  title: string;
  value: string;
  change: string;
  description: string;
  trend: "up" | "down" | "neutral";
}

export interface ActivityItem {
  title: string;
  subtitle: string;
  meta: string;
}

export interface CampaignItem {
  title: string;
  owner: string;
  progress: number;
  dueDate: string;
}
