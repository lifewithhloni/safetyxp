export function calculateCompletion(completed: number, total: number) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function determineComplianceStatus(percent: number) {
  if (percent >= 100) return "COMPLIANT";
  if (percent >= 80) return "ON_TRACK";
  if (percent >= 50) return "AT_RISK";
  if (percent > 0) return "OVERDUE";
  return "NOT_STARTED";
}
