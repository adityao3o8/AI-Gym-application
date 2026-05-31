/** Composite member score: consistency + progress + form quality. */

export type GymCredInput = {
  streak: number;
  workoutCount: number;
  trophyCount: number;
  avgFormScore: number | null;
  checkInCount: number;
  seasonXp: number;
};

export function computeGymCred(input: GymCredInput): number {
  const streakPts = Math.min(input.streak * 8, 200);
  const workoutPts = Math.min(input.workoutCount * 5, 250);
  const trophyPts = Math.min(input.trophyCount * 25, 150);
  const formPts =
    input.avgFormScore !== null ? Math.round(input.avgFormScore * 0.5) : 0;
  const checkInPts = Math.min(input.checkInCount * 3, 90);
  const seasonPts = Math.min(input.seasonXp, 300);
  return streakPts + workoutPts + trophyPts + formPts + checkInPts + seasonPts;
}

export function credTier(cred: number): {
  label: string;
  color: string;
  nextAt: number | null;
} {
  if (cred >= 800) return { label: "Elite", color: "#bf5af2", nextAt: null };
  if (cred >= 500) return { label: "Gold", color: "#ffd60a", nextAt: 800 };
  if (cred >= 250) return { label: "Silver", color: "#c0c0c0", nextAt: 500 };
  if (cred >= 100) return { label: "Bronze", color: "#cd7f32", nextAt: 250 };
  return { label: "Rookie", color: "#8e8e93", nextAt: 100 };
}
