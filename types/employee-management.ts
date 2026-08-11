export interface EmployeeRecord {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  manager: string;
  location: string;
  campaign: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  complianceScore: number;
  status: "Compliant" | "In Progress" | "Overdue" | "Not Started";
  lastActivity: string;
  xp: number;
  level: number;
  quizAverage: number;
  scenarioCompletion: number;
  timeRemaining: string;
  certificates: Array<{
    title: string;
    expiryDate: string;
    status: string;
  }>;
  activityTimeline: Array<{
    title: string;
    meta: string;
  }>;
  aiInsight: string;
}

export interface EmployeeFiltersState {
  department: string;
  location: string;
  manager: string;
  campaign: string;
  complianceStatus: string;
}
