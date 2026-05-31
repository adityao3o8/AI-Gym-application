import type { Metadata } from "next";
import { Brain } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { coachReply } from "@/lib/coach-chat";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Coach Chat" };

type Props = { searchParams: Promise<{ q?: string; error?: string }> };

export default async function CoachChatPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("streak_count, gym_cred, injury_flags")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: history } = await supabase
    .from("workouts")
    .select("performed_at, workout_entries(exercise_name, sets, reps, weight_kg)")
    .eq("user_id", user?.id ?? "")
    .order("performed_at", { ascending: false })
    .limit(40);

  const entries = [];
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

  const { count: workoutCount } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "");

  const answer = params.q
    ? coachReply(params.q, entries, {
        streak: profile?.streak_count ?? 0,
        gymCred: profile?.gym_cred ?? 0,
        injuries: profile?.injury_flags ?? [],
        workoutCount: workoutCount ?? 0,
      })
    : null;

  const prompts = [
    "What should I train next?",
    "I'm plateauing on bench",
    "My shoulder is sore",
    "How does Gym Cred work?",
  ];

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Brain className="size-4 text-apple-purple" /> Coach Chat
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Ask your <span className="gradient-text">data-driven</span> coach
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Uses your workout history, injuries, streak & Gym Cred — no generic PDF advice.
        </p>
      </header>

      <GlassCard className="mb-4 p-4">
        <form action="/coach/chat" method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Ask anything about training…"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-apple-blue px-4 text-sm font-medium text-white"
          >
            Ask
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <a
              key={p}
              href={`/coach/chat?q=${encodeURIComponent(p)}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              {p}
            </a>
          ))}
        </div>
      </GlassCard>

      {answer && (
        <GlassCard className="p-5" glow="purple">
          <p className="text-xs uppercase tracking-widest text-white/40">Coach</p>
          <p className="mt-2 text-sm leading-relaxed text-white/90">{answer}</p>
        </GlassCard>
      )}
    </div>
  );
}
