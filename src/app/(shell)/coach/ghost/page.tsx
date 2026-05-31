import type { Metadata } from "next";
import Link from "next/link";
import { Ghost } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ghost Rep" };

type Props = { searchParams: Promise<{ message?: string; error?: string }> };

export default async function GhostRepPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("ghost_sessions")
    .select("id, exercise, reps, form_score, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Ghost className="size-4 text-apple-purple" /> Ghost Rep
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Race your <span className="gradient-text">past self</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Save a reference session from Form Check, then overlay it on your next attempt.
        </p>
      </header>

      {params.message && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {params.message}
        </p>
      )}

      <GlassCard className="mb-5 p-5" glow="blue">
        <p className="text-sm text-white/70">
          1. Run <Link href="/coach/form-check" className="text-apple-blue">Form Check</Link> on
          your best set
        </p>
        <p className="mt-2 text-sm text-white/70">
          2. Click &quot;Save as Ghost&quot; after analysis
        </p>
        <p className="mt-2 text-sm text-white/70">
          3. Next session — compare live angles against your ghost baseline
        </p>
      </GlassCard>

      <GlassCard className="p-5">
        <p className="mb-3 font-semibold text-white">Saved ghost sessions</p>
        {(sessions ?? []).length === 0 ? (
          <p className="text-sm text-white/50">No ghosts saved yet.</p>
        ) : (
          <ul className="space-y-2">
            {(sessions ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className="text-white capitalize">{s.exercise}</span>
                <span className="text-white/60">
                  {s.reps} reps · {s.form_score ? `${s.form_score}% form` : "—"} ·{" "}
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <p className="mt-4 text-center text-xs text-white/40">
        Ghost overlay renders during live Form Check when a saved session exists for that exercise.
      </p>
    </div>
  );
}
