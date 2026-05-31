export type InjuryFlag =
  | "lower_back"
  | "shoulder"
  | "knee"
  | "elbow"
  | "wrist"
  | "hip";

export const INJURY_OPTIONS: { id: InjuryFlag; label: string }[] = [
  { id: "lower_back", label: "Lower back" },
  { id: "shoulder", label: "Shoulder" },
  { id: "knee", label: "Knee" },
  { id: "elbow", label: "Elbow" },
  { id: "wrist", label: "Wrist" },
  { id: "hip", label: "Hip" },
];

const BLOCKED_KEYWORDS: Record<InjuryFlag, string[]> = {
  lower_back: ["deadlift", "row", "good morning", "back squat"],
  shoulder: ["overhead", "press", "lateral", "dip", "bench"],
  knee: ["squat", "lunge", "leg press", "leg extension"],
  elbow: ["curl", "extension", "skull", "dip", "bench"],
  wrist: ["bench", "curl", "push up", "front squat"],
  hip: ["squat", "lunge", "deadlift", "hip thrust"],
};

const SAFE_ALTERNATIVES: Record<InjuryFlag, string[]> = {
  lower_back: ["Leg Press", "Plank", "Cycling"],
  shoulder: ["Leg Press", "Lat Pulldown", "Plank"],
  knee: ["Romanian Deadlift", "Cycling", "Plank"],
  elbow: ["Leg Press", "Lateral Raise", "Plank"],
  wrist: ["Leg Press", "Lat Pulldown", "Cycling"],
  hip: ["Bench Press", "Lat Pulldown", "Cycling"],
};

export function isExerciseBlocked(
  exerciseName: string,
  injuries: InjuryFlag[]
): boolean {
  const lower = exerciseName.toLowerCase();
  for (const injury of injuries) {
    const keywords = BLOCKED_KEYWORDS[injury] ?? [];
    if (keywords.some((k) => lower.includes(k))) return true;
  }
  return false;
}

export function filterExercises<T extends { name: string }>(
  exercises: T[],
  injuries: InjuryFlag[]
): T[] {
  if (injuries.length === 0) return exercises;
  return exercises.filter((e) => !isExerciseBlocked(e.name, injuries));
}

export function injurySwapSuggestions(injuries: InjuryFlag[]): string[] {
  const out = new Set<string>();
  for (const injury of injuries) {
    for (const alt of SAFE_ALTERNATIVES[injury] ?? []) out.add(alt);
  }
  return Array.from(out).slice(0, 4);
}

export function parseInjuryFlags(raw: string[] | null | undefined): InjuryFlag[] {
  const valid = new Set(INJURY_OPTIONS.map((o) => o.id));
  return (raw ?? []).filter((f): f is InjuryFlag => valid.has(f as InjuryFlag));
}
