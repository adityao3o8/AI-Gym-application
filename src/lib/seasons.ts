export type Division = "bronze" | "silver" | "gold" | "elite";

export const DIVISION_THRESHOLDS: { division: Division; minXp: number; label: string }[] = [
  { division: "elite", minXp: 1200, label: "Elite" },
  { division: "gold", minXp: 600, label: "Gold" },
  { division: "silver", minXp: 250, label: "Silver" },
  { division: "bronze", minXp: 0, label: "Bronze" },
];

export function divisionFromXp(xp: number): Division {
  for (const t of DIVISION_THRESHOLDS) {
    if (xp >= t.minXp) return t.division;
  }
  return "bronze";
}

export function divisionLabel(d: Division): string {
  return DIVISION_THRESHOLDS.find((t) => t.division === d)?.label ?? d;
}

export function xpToNextDivision(xp: number): {
  current: Division;
  next: Division | null;
  remaining: number;
  progress: number;
} {
  const current = divisionFromXp(xp);
  const idx = DIVISION_THRESHOLDS.findIndex((t) => t.division === current);
  const next = idx > 0 ? DIVISION_THRESHOLDS[idx - 1] : null;
  if (!next) {
    return { current, next: null, remaining: 0, progress: 100 };
  }
  const floor = DIVISION_THRESHOLDS[idx].minXp;
  const ceiling = next.minXp;
  const remaining = ceiling - xp;
  const progress = Math.round(((xp - floor) / (ceiling - floor)) * 100);
  return { current, next: next.division, remaining, progress };
}

/** XP grants for gamification events. */
export const XP_REWARDS = {
  workout: 25,
  checkIn: 15,
  formCheck: 20,
  pr: 50,
  challengeComplete: 100,
  streakDay: 10,
} as const;
