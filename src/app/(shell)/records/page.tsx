import type { Metadata } from "next";
import { Award, TrendingUp } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Personal Records",
};

type EntryRow = {
  exercise_name: string;
  weight_kg: number | null;
  reps: number;
  sets: number;
  workout: { performed_at: string } | { performed_at: string }[] | null;
};

type PR = {
  exercise: string;
  maxWeight: number;
  reps: number;
  sets: number;
  date: string;
};

function performedAt(row: EntryRow): string | null {
  if (!row.workout) return null;
  if (Array.isArray(row.workout)) return row.workout[0]?.performed_at ?? null;
  return row.workout.performed_at;
}

export default async function RecordsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("workout_entries")
    .select(
      "exercise_name, weight_kg, reps, sets, workout:workouts(performed_at, user_id)"
    )
    .order("weight_kg", { ascending: false, nullsFirst: false })
    .limit(1000);

  const filtered = (rows ?? [])
    .filter((r) => {
      const w = r.workout;
      if (!w) return false;
      const ownerId = Array.isArray(w) ? w[0]?.user_id : w.user_id;
      return ownerId === user?.id;
    })
    .filter((r): r is EntryRow & { weight_kg: number } => r.weight_kg !== null);

  const map = new Map<string, PR>();
  for (const r of filtered) {
    const key = r.exercise_name.toLowerCase();
    const date = performedAt(r) ?? new Date().toISOString();
    const existing = map.get(key);
    if (!existing || r.weight_kg > existing.maxWeight) {
      map.set(key, {
        exercise: r.exercise_name,
        maxWeight: r.weight_kg,
        reps: r.reps,
        sets: r.sets,
        date,
      });
    }
  }

  const prs = Array.from(map.values()).sort((a, b) => b.maxWeight - a.maxWeight);

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Award className="size-4 text-apple-blue" />
          Personal Records
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your <span className="gradient-text">heaviest</span> lifts
        </h1>
        <p className="mt-2 text-white/60">
          Auto-detected from every weighted set you have logged.
        </p>
      </header>

      {prs.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">
            No records yet. Log a workout with weights to start tracking PRs.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prs.map((pr) => (
            <GlassCard key={pr.exercise} hover glow="blue" className="p-5">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-apple-blue/30 to-apple-purple/30">
                <TrendingUp className="size-5 text-white" />
              </div>
              <p className="text-lg font-semibold text-white">{pr.exercise}</p>
              <p className="mt-2 text-3xl font-bold gradient-text">
                {pr.maxWeight}kg
              </p>
              <p className="mt-1 text-sm text-white/60">
                {pr.sets}×{pr.reps} ·{" "}
                {new Date(pr.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
