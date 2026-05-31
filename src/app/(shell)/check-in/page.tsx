import type { Metadata } from "next";
import { QrCode } from "lucide-react";

import { checkInGym } from "@/app/actions/features";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Check-in" };

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function CheckInPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  let gym: { name: string; check_in_code: string | null } | null = null;
  if (profile?.gym_id) {
    const { data } = await supabase
      .from("gyms")
      .select("name, check_in_code")
      .eq("id", profile.gym_id)
      .maybeSingle();
    gym = data;
  }

  const { count: todayCheckIns } = profile?.gym_id
    ? await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id ?? "")
        .gte("checked_in_at", new Date().toISOString().slice(0, 10))
    : { count: 0 };

  return (
    <div className="relative mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <header className="mb-6 text-center">
        <QrCode className="mx-auto mb-2 size-8 text-apple-blue" />
        <h1 className="text-3xl font-semibold text-white">
          Gym <span className="gradient-text">check-in</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your gym&apos;s code to link your account and log attendance.
        </p>
      </header>

      {params.message && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {params.error}
        </p>
      )}

      <GlassCard className="p-6" glow="blue">
        {gym ? (
          <p className="mb-4 text-center text-sm text-white/70">
            Linked to <strong className="text-white">{gym.name}</strong>
            {todayCheckIns ? " · checked in today ✓" : ""}
          </p>
        ) : null}

        <form action={checkInGym} className="space-y-4">
          <input
            name="check_in_code"
            placeholder="GYM-CODE (ask front desk)"
            defaultValue={gym?.check_in_code ?? ""}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-lg tracking-widest text-white uppercase"
          />
          <Button type="submit" variant="primary" className="h-12 w-full">
            Check in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-white/40">
          +15 Season XP · updates Gym Cred · powers owner heatmap
        </p>
      </GlassCard>
    </div>
  );
}
