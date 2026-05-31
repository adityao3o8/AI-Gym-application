import type { Exercise, FrameMetrics } from "@/lib/form-analyzer";

/** Classify exercise from first ~2s of pose metrics (no user pick needed). */
export function detectExercise(metrics: FrameMetrics[]): Exercise | null {
  const sample = metrics
    .filter((m) => m.visibility >= 0.5)
    .slice(0, 30);
  if (sample.length < 8) return null;

  const kneeRom = rom(sample.map((m) => m.kneeAngle));
  const elbowRom = rom(sample.map((m) => m.elbowAngle));
  const hipRom = rom(sample.map((m) => m.hipAngle));
  const avgBack =
    avg(sample.map((m) => m.backAngleDeg).filter((v): v is number => v !== null)) ??
    0;

  if (kneeRom > 35 && kneeRom >= elbowRom) return "squat";
  if (hipRom > 30 && avgBack > 25 && kneeRom < 25) return "deadlift";
  if (elbowRom > 40 && avgBack < 30) {
    const maxElbow = Math.max(
      ...sample.map((m) => m.elbowAngle ?? 0)
    );
    return maxElbow > 150 ? "overhead" : "bench";
  }
  if (elbowRom > 50 && kneeRom < 15) return "pullup";
  return null;
}

function rom(values: Array<number | null>): number {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 3) return 0;
  return Math.max(...nums) - Math.min(...nums);
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function exerciseDisplayName(ex: Exercise): string {
  const map: Record<Exercise, string> = {
    squat: "Squat",
    deadlift: "Deadlift",
    bench: "Bench Press",
    overhead: "Overhead Press",
    pullup: "Pull-up",
  };
  return map[ex];
}
