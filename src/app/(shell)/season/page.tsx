import type { Metadata } from "next";
import { Sparkles, Trophy } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { credTier } from "@/lib/gym-cred";
import { divisionLabel, xpToNextDivision } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Season" };

export default async function SeasonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: season }] = await Promise.all([
    supabase
      .from("users")
      .select("season_xp, division, gym_cred, streak_count, rest_tokens")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("seasons")
      .select("name, ends_at")
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const xp = profile?.season_xp ?? 0;
  const cred = profile?.gym_cred ?? 0;
  const prog = xpToNextDivision(xp);
  const tier = credTier(cred);

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Sparkles className="size-4 text-apple-purple" />
          {season?.name ?? "Current Season"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Season & <span className="gradient-text">Gym Cred</span>
        </h1>
        {season?.ends_at && (
          <p className="mt-2 text-sm text-white/60">
            Ends {new Date(season.ends_at).toLocaleDateString()}
          </p>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-6" glow="purple">
          <p className="text-sm text-white/60">Division</p>
          <p className="mt-1 text-4xl font-bold capitalize text-white">
            {divisionLabel(prog.current)}
          </p>
          <p className="mt-1 text-sm text-white/50">{xp} Season XP</p>
          {prog.next && (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-apple-blue to-apple-purple"
                  style={{ width: `${prog.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/40">
                {prog.remaining} XP to {divisionLabel(prog.next)}
              </p>
            </>
          )}
        </GlassCard>

        <GlassCard className="p-6" glow="blue">
          <p className="flex items-center gap-2 text-sm text-white/60">
            <Trophy className="size-4" /> Gym Cred
          </p>
          <p className="mt-1 text-4xl font-bold text-white">{cred}</p>
          <p className="mt-1 text-sm font-medium" style={{ color: tier.color }}>
            {tier.label} tier
          </p>
          <p className="mt-3 text-xs text-white/50">
            Blends streak ({profile?.streak_count ?? 0}d), workouts, trophies, check-ins,
            form scores & season XP.
          </p>
        </GlassCard>

        <GlassCard className="p-5 sm:col-span-2">
          <p className="text-lg font-semibold text-white">Streak Insurance</p>
          <p className="mt-2 text-sm text-white/60">
            You have <strong className="text-white">{profile?.rest_tokens ?? 0}</strong> rest
            token(s). Missing one day uses a token instead of breaking your streak (once per
            gap).
          </p>
          <p className="mt-2 text-xs text-white/40">
            Earn +1 rest token each month you maintain a 7+ day streak.
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
