import type { Metadata } from "next";
import { Calendar, Dumbbell, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createWorkout, deleteWorkout } from "@/app/actions/workouts";
import { createClient } from "@/lib/supabase/server";

import { WorkoutForm } from "./workout-form";

export const metadata: Metadata = {
  title: "Workouts",
};

type WorkoutsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, title, notes, performed_at, workout_entries(exercise_name, sets, reps, weight_kg)")
    .eq("user_id", user?.id ?? "")
    .order("performed_at", { ascending: false })
    .limit(20);

  const list = workouts ?? [];

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm text-white/60">Workouts</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Log a new <span className="gradient-text">session</span>
        </h1>
        <p className="mt-2 text-white/60">Add exercises with sets, reps, and weight.</p>
      </header>

      {params.message ? (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {params.message}
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {params.error}
        </p>
      ) : null}

      <WorkoutForm action={createWorkout} />

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <Dumbbell className="size-5 text-apple-blue" />
          Recent workouts
        </h2>

        {list.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-white/70">No workouts yet. Log your first one above.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((workout) => (
              <GlassCard key={workout.id} hover className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{workout.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                      <Calendar className="size-3" />
                      {formatDate(workout.performed_at)}
                    </p>
                  </div>
                  <form action={deleteWorkout}>
                    <input type="hidden" name="id" value={workout.id} />
                    <Button type="submit" variant="ghost" size="sm" aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>

                {workout.notes ? (
                  <p className="mb-3 text-sm text-white/60">{workout.notes}</p>
                ) : null}

                {workout.workout_entries && workout.workout_entries.length > 0 ? (
                  <ul className="space-y-1.5">
                    {workout.workout_entries.map((entry, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <span className="text-white">{entry.exercise_name}</span>
                        <span className="text-white/60">
                          {entry.sets}×{entry.reps}
                          {entry.weight_kg ? ` · ${entry.weight_kg}kg` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/40">No exercises logged.</p>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
