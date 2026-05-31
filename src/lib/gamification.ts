export type StreakInfo = {
  newStreak: number;
  isNewDay: boolean;
};

/**
 * Compute the new streak value given the previous streak, the last workout date,
 * and the current workout date. Streak continues if the new workout is on the
 * day after the previous one, resets to 1 if there's a gap, and stays the same
 * if it's a same-day workout.
 */
export function computeStreak(
  prevStreak: number,
  prevDate: Date | null,
  nextDate: Date
): StreakInfo {
  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };

  if (!prevDate) {
    return { newStreak: 1, isNewDay: true };
  }

  const prev = startOfDay(prevDate).getTime();
  const next = startOfDay(nextDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((next - prev) / dayMs);

  if (diffDays === 0) {
    return { newStreak: Math.max(prevStreak, 1), isNewDay: false };
  }
  if (diffDays === 1) {
    return { newStreak: (prevStreak || 0) + 1, isNewDay: true };
  }
  return { newStreak: 1, isNewDay: true };
}

export type TrophyCriteria =
  | { type: "workout_count"; min: number }
  | { type: "streak"; min: number }
  | { type: string; [key: string]: unknown };

export function meetsCriteria(
  criteria: TrophyCriteria,
  ctx: { workoutCount: number; streak: number }
) {
  if (criteria.type === "workout_count") {
    return ctx.workoutCount >= (criteria.min ?? 1);
  }
  if (criteria.type === "streak") {
    return ctx.streak >= (criteria.min ?? 1);
  }
  return false;
}
