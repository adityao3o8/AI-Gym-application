/**
 * Lightweight rule-based AI workout coach.
 *
 * Analyzes recent workout history to detect under-trained muscle groups
 * and suggests a balanced next session with progressive overload hints
 * based on the user's most recent recorded weights.
 */

export type MuscleGroup = "push" | "pull" | "legs" | "core" | "cardio";

export type Exercise = {
  name: string;
  group: MuscleGroup;
};

export type CoachEntry = {
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  performed_at: string;
};

export type Suggestion = {
  exercise: string;
  group: MuscleGroup;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rationale: string;
};

export type CoachPlan = {
  focus: MuscleGroup;
  headline: string;
  rationale: string;
  suggestions: Suggestion[];
};

const CATALOG: Exercise[] = [
  // Push
  { name: "Bench Press", group: "push" },
  { name: "Incline Dumbbell Press", group: "push" },
  { name: "Overhead Press", group: "push" },
  { name: "Push Up", group: "push" },
  { name: "Dips", group: "push" },
  { name: "Lateral Raise", group: "push" },
  { name: "Tricep Extension", group: "push" },
  // Pull
  { name: "Pull Up", group: "pull" },
  { name: "Lat Pulldown", group: "pull" },
  { name: "Barbell Row", group: "pull" },
  { name: "Seated Cable Row", group: "pull" },
  { name: "Face Pull", group: "pull" },
  { name: "Bicep Curl", group: "pull" },
  { name: "Hammer Curl", group: "pull" },
  // Legs
  { name: "Back Squat", group: "legs" },
  { name: "Front Squat", group: "legs" },
  { name: "Romanian Deadlift", group: "legs" },
  { name: "Lunge", group: "legs" },
  { name: "Leg Press", group: "legs" },
  { name: "Leg Curl", group: "legs" },
  { name: "Calf Raise", group: "legs" },
  // Core
  { name: "Plank", group: "core" },
  { name: "Hanging Leg Raise", group: "core" },
  { name: "Russian Twist", group: "core" },
  { name: "Cable Crunch", group: "core" },
  // Cardio
  { name: "Treadmill Run", group: "cardio" },
  { name: "Rowing Machine", group: "cardio" },
  { name: "Cycling", group: "cardio" },
];

const GROUP_LABEL: Record<MuscleGroup, string> = {
  push: "Push (Chest, Shoulders, Triceps)",
  pull: "Pull (Back, Biceps)",
  legs: "Legs (Quads, Hamstrings, Glutes)",
  core: "Core",
  cardio: "Cardio",
};

function classify(name: string): MuscleGroup {
  const n = name.toLowerCase();
  if (
    n.includes("bench") ||
    n.includes("press") ||
    n.includes("push") ||
    n.includes("chest") ||
    n.includes("tricep") ||
    n.includes("dip") ||
    n.includes("lateral") ||
    n.includes("shoulder")
  ) {
    return "push";
  }
  if (
    n.includes("pull") ||
    n.includes("row") ||
    n.includes("lat") ||
    n.includes("curl") ||
    n.includes("face pull") ||
    n.includes("bicep") ||
    n.includes("back")
  ) {
    return "pull";
  }
  if (
    n.includes("squat") ||
    n.includes("lunge") ||
    n.includes("leg") ||
    n.includes("deadlift") ||
    n.includes("calf") ||
    n.includes("hamstring") ||
    n.includes("quad") ||
    n.includes("glute")
  ) {
    return "legs";
  }
  if (
    n.includes("plank") ||
    n.includes("crunch") ||
    n.includes("twist") ||
    n.includes("ab") ||
    n.includes("core")
  ) {
    return "core";
  }
  if (
    n.includes("run") ||
    n.includes("cycle") ||
    n.includes("bike") ||
    n.includes("row") ||
    n.includes("treadmill") ||
    n.includes("cardio")
  ) {
    return "cardio";
  }
  return "push";
}

function pickFocus(entries: CoachEntry[]): MuscleGroup {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const counts: Record<MuscleGroup, number> = {
    push: 0,
    pull: 0,
    legs: 0,
    core: 0,
    cardio: 0,
  };

  for (const e of entries) {
    const age = (now - new Date(e.performed_at).getTime()) / dayMs;
    if (age > 14) continue;
    const decay = Math.max(0.2, 1 - age / 14);
    counts[classify(e.exercise_name)] += e.sets * decay;
  }

  // Strength groups prioritized; cardio only chosen if explicitly low
  const order: MuscleGroup[] = ["push", "pull", "legs", "core"];
  let min: MuscleGroup = "push";
  let minVal = Infinity;
  for (const g of order) {
    if (counts[g] < minVal) {
      minVal = counts[g];
      min = g;
    }
  }
  return min;
}

function progressiveOverload(prev: number | null): number | null {
  if (prev === null) return null;
  if (prev < 20) return Math.round((prev + 1) * 10) / 10;
  return Math.round((prev + 2.5) * 10) / 10;
}

function recentWeight(entries: CoachEntry[], exercise: string): number | null {
  const lower = exercise.toLowerCase();
  const matches = entries
    .filter((e) => e.exercise_name.toLowerCase() === lower)
    .filter((e) => e.weight_kg !== null)
    .sort(
      (a, b) =>
        new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
    );
  return matches[0]?.weight_kg ?? null;
}

export function generatePlan(entries: CoachEntry[]): CoachPlan {
  if (entries.length === 0) {
    const starter = CATALOG.filter((e) => e.group === "push").slice(0, 5);
    return {
      focus: "push",
      headline: "Start with a balanced push day",
      rationale:
        "You have no logged workouts yet — a moderate Push session is a great baseline to build from.",
      suggestions: starter.map((ex) => ({
        exercise: ex.name,
        group: ex.group,
        sets: 3,
        reps: 10,
        weight_kg: null,
        rationale: "Begin light, focus on form, and progress next session.",
      })),
    };
  }

  const focus = pickFocus(entries);
  const pool = CATALOG.filter((e) => e.group === focus);
  const trained = new Set(
    entries
      .filter(
        (e) =>
          Date.now() - new Date(e.performed_at).getTime() <
          5 * 24 * 60 * 60 * 1000
      )
      .map((e) => e.exercise_name.toLowerCase())
  );

  const fresh = pool.filter((e) => !trained.has(e.name.toLowerCase()));
  const chosen = (fresh.length >= 5 ? fresh : pool).slice(0, 5);

  const suggestions: Suggestion[] = chosen.map((ex) => {
    const prev = recentWeight(entries, ex.name);
    const next = progressiveOverload(prev);
    return {
      exercise: ex.name,
      group: ex.group,
      sets: 4,
      reps: focus === "legs" ? 8 : 10,
      weight_kg: next,
      rationale:
        prev !== null
          ? `Last time you used ${prev}kg — try ${next}kg today for progressive overload.`
          : `New exercise for you. Start light to learn the movement.`,
    };
  });

  return {
    focus,
    headline: `Recommended: ${GROUP_LABEL[focus]} day`,
    rationale: `Your recent training has the least volume in your ${focus} group. A focused session will rebalance your week.`,
    suggestions,
  };
}

export const GROUP_LABELS = GROUP_LABEL;
