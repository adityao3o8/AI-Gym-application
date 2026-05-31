import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, Ghost, MessageCircle, ScanLine, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";
import { isExerciseBlocked, parseInjuryFlags } from "@/lib/injury-coach";
import { GROUP_LABELS, generatePlan, type CoachEntry } from "@/lib/ai-coach";

export const metadata: Metadata = {
  title: "AI Coach",
};

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: history } = await supabase
    .from("workouts")
    .select(
      "performed_at, workout_entries(exercise_name, sets, reps, weight_kg)"
    )
    .eq("user_id", user?.id ?? "")
    .order("performed_at", { ascending: false })
    .limit(40);

  const entries: CoachEntry[] = [];
  for (const w of history ?? []) {
    for (const e of w.workout_entries ?? []) {
      entries.push({
        exercise_name: e.exercise_name,
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg,
        performed_at: w.performed_at,
      });
    }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("injury_flags")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const injuries = parseInjuryFlags(profile?.injury_flags);
  const avoidExercises = [
    "Bench Press", "Back Squat", "Deadlift", "Overhead Press", "Pull Up",
    "Romanian Deadlift", "Barbell Row", "Incline Dumbbell Press",
  ].filter((name) => isExerciseBlocked(name, injuries));

  const plan = generatePlan(entries, { avoidExercises });
  const totalSessions = (history ?? []).length;

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Brain className="size-4 text-apple-purple" />
          AI Coach
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your <span className="gradient-text">personalized</span> next workout
        </h1>
        <p className="mt-2 text-white/60">
          Built from {totalSessions} of your recent sessions. Suggestions adapt as you log more.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <GlassCard hover className="p-4">
          <ScanLine className="mb-2 size-5 text-apple-blue" />
          <p className="font-semibold text-white">Form Check</p>
          <p className="mt-1 text-xs text-white/50">Video · reps · tempo · fatigue</p>
          <Button variant="ghost" size="sm" className="mt-2" render={<Link href="/coach/form-check" />}>
            Open <ArrowRight className="size-3" />
          </Button>
        </GlassCard>
        <GlassCard hover className="p-4">
          <MessageCircle className="mb-2 size-5 text-apple-purple" />
          <p className="font-semibold text-white">Coach Chat</p>
          <p className="mt-1 text-xs text-white/50">Ask about plateaus & injuries</p>
          <Button variant="ghost" size="sm" className="mt-2" render={<Link href="/coach/chat" />}>
            Chat <ArrowRight className="size-3" />
          </Button>
        </GlassCard>
        <GlassCard hover className="p-4">
          <Ghost className="mb-2 size-5 text-white/80" />
          <p className="font-semibold text-white">Ghost Rep</p>
          <p className="mt-1 text-xs text-white/50">Race your past self</p>
          <Button variant="ghost" size="sm" className="mt-2" render={<Link href="/coach/ghost" />}>
            View <ArrowRight className="size-3" />
          </Button>
        </GlassCard>
      </section>

      {injuries.length > 0 && (
        <GlassCard className="mb-6 p-4" glow="teal">
          <p className="text-sm text-white/80">
            Injury-aware mode: avoiding exercises stressing{" "}
            <strong>{injuries.join(", ")}</strong>. Update in Profile.
          </p>
        </GlassCard>
      )}

      <GlassCard className="mb-6 p-6" glow="purple">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <Target className="size-5 text-apple-blue" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">
              Focus area
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{plan.headline}</p>
            <p className="mt-2 text-sm text-white/60">{plan.rationale}</p>
            <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              {GROUP_LABELS[plan.focus]}
            </p>
          </div>
        </div>
      </GlassCard>

      <section className="grid gap-4 sm:grid-cols-2">
        {plan.suggestions.map((s, idx) => (
          <GlassCard key={`${s.exercise}-${idx}`} hover className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{s.exercise}</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-widest text-white/60">
                {s.group}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                <p className="text-xs text-white/50">Sets</p>
                <p className="text-base font-semibold text-white">{s.sets}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                <p className="text-xs text-white/50">Reps</p>
                <p className="text-base font-semibold text-white">{s.reps}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                <p className="text-xs text-white/50">Weight</p>
                <p className="text-base font-semibold text-white">
                  {s.weight_kg !== null ? `${s.weight_kg}kg` : "—"}
                </p>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-white/60">
              <Sparkles className="mt-0.5 size-3 shrink-0 text-apple-blue" />
              {s.rationale}
            </p>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
