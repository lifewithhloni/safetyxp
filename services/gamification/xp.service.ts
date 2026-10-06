const xpLedger = new Map<string, number>();
const awardedMissionXp = new Set<string>();

export function awardXP({ employeeId, amount, reason, missionKey }: { employeeId: string; amount: number; reason: string; missionKey?: string }) {
  const missionId = missionKey ?? `${employeeId}:${reason}`;

  if (missionKey && awardedMissionXp.has(`${employeeId}:${missionId}`)) {
    return {
      employeeId,
      amount: 0,
      reason,
      totalXp: xpLedger.get(employeeId) ?? 0,
      awarded: false,
    };
  }

  const prior = xpLedger.get(employeeId) ?? 0;
  const totalXp = prior + amount;
  xpLedger.set(employeeId, totalXp);

  if (missionKey) {
    awardedMissionXp.add(`${employeeId}:${missionId}`);
  }

  return {
    employeeId,
    amount,
    reason,
    totalXp,
    awarded: true,
  };
}

export function getEmployeeXP(employeeId: string) {
  return xpLedger.get(employeeId) ?? 0;
}

export function calculateLevel(xp: number) {
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}
