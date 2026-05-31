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
  | { type: "gym_cred"; min: number }
  | { type: "check_in_count"; min: number }
  | { type: "challenge_complete"; min: number };

function criteriaMin(criteria: TrophyCriteria): number {
  return "min" in criteria ? criteria.min : 1;
}

export function meetsCriteria(
  criteria: TrophyCriteria,
  ctx: {
    workoutCount: number;
    streak: number;
    gymCred?: number;
    checkInCount?: number;
    challengesCompleted?: number;
  }
) {
  if (criteria.type === "workout_count") {
    return ctx.workoutCount >= criteriaMin(criteria);
  }
  if (criteria.type === "streak") {
    return ctx.streak >= criteriaMin(criteria);
  }
  if (criteria.type === "gym_cred") {
    return (ctx.gymCred ?? 0) >= criteriaMin(criteria);
  }
  if (criteria.type === "check_in_count") {
    return (ctx.checkInCount ?? 0) >= criteriaMin(criteria);
  }
  if (criteria.type === "challenge_complete") {
    return (ctx.challengesCompleted ?? 0) >= criteriaMin(criteria);
  }
  return false;
}

/** Streak with optional rest-token forgiveness (1-day gap). */
export function computeStreakWithRestToken(
  prevStreak: number,
  prevDate: Date | null,
  nextDate: Date,
  restTokens: number
): StreakInfo & { usedRestToken: boolean; tokensLeft: number } {
  const base = computeStreak(prevStreak, prevDate, nextDate);
  if (base.newStreak > 1 || !prevDate || restTokens <= 0) {
    return { ...base, usedRestToken: false, tokensLeft: restTokens };
  }

  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const diffDays = Math.round(
    (startOfDay(nextDate).getTime() - startOfDay(prevDate).getTime()) /
      (24 * 60 * 60 * 1000)
  );

  if (diffDays === 2) {
    return {
      newStreak: (prevStreak || 0) + 1,
      isNewDay: true,
      usedRestToken: true,
      tokensLeft: restTokens - 1,
    };
  }
  return { ...base, usedRestToken: false, tokensLeft: restTokens };
}
