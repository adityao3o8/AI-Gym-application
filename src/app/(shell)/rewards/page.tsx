import type { Metadata } from "next";
import { Flame, Medal, Trophy as TrophyIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Rewards",
};

const iconMap = {
  trophy: TrophyIcon,
  flame: Flame,
  medal: Medal,
  dumbbell: TrophyIcon,
} as const;

function IconFor({ name }: { name: string }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? TrophyIcon;
  return <Icon className="size-6 text-white" />;
}

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: trophies }, { data: earned }] = await Promise.all([
    supabase.from("trophies").select("id, slug, name, description, icon").order("name"),
    supabase
      .from("user_trophies")
      .select("trophy_id, earned_at")
      .eq("user_id", user?.id ?? ""),
  ]);

  const earnedMap = new Map(earned?.map((t) => [t.trophy_id, t.earned_at]) ?? []);
  const list = trophies ?? [];
  const earnedCount = earnedMap.size;

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm text-white/60">Rewards</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Trophies & <span className="gradient-text">badges</span>
        </h1>
        <p className="mt-2 text-white/60">
          {earnedCount} of {list.length} unlocked.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 ? (
          <GlassCard className="col-span-full p-6 text-center">
            <p className="text-white/70">No trophies configured yet.</p>
          </GlassCard>
        ) : (
          list.map((trophy) => {
            const isEarned = earnedMap.has(trophy.id);
            return (
              <GlassCard
                key={trophy.id}
                hover
                glow={isEarned ? "purple" : undefined}
                className={`p-5 ${isEarned ? "" : "opacity-60"}`}
              >
                <div
                  className={`mb-3 inline-flex size-12 items-center justify-center rounded-xl border ${
                    isEarned
                      ? "border-apple-purple/40 bg-gradient-to-br from-apple-blue/30 to-apple-purple/30"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <IconFor name={trophy.icon} />
                </div>
                <p className="text-lg font-semibold text-white">{trophy.name}</p>
                {trophy.description ? (
                  <p className="mt-1 text-sm text-white/60">{trophy.description}</p>
                ) : null}
                <p className="mt-3 text-xs uppercase tracking-widest text-white/40">
                  {isEarned ? "Unlocked" : "Locked"}
                </p>
              </GlassCard>
            );
          })
        )}
      </section>
    </div>
  );
}
