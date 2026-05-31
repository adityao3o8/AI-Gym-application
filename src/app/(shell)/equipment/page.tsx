import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { claimEquipment, releaseEquipment } from "@/app/actions/features";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Equipment" };

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function EquipmentPage({ searchParams }: Props) {
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

  if (!profile?.gym_id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <GlassCard className="p-8">
          <p className="text-white/70">Check in to your gym first to see equipment.</p>
          <Link
            href="/check-in"
            className="mt-4 inline-block rounded-xl bg-apple-blue px-4 py-2 text-sm text-white"
          >
            Check in
          </Link>
        </GlassCard>
      </div>
    );
  }

  const { data: equipment } = await supabase
    .from("gym_equipment")
    .select("id, name, zone, capacity")
    .eq("gym_id", profile.gym_id)
    .order("zone");

  const { data: activeUsage } = await supabase
    .from("equipment_usage")
    .select("id, equipment_id, user_id, started_at")
    .is("ended_at", null);

  const usageByEquip = new Map(
    (activeUsage ?? []).map((u) => [u.equipment_id, u])
  );

  const list = equipment ?? [];

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Dumbbell className="size-4" /> Equipment queue
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          What&apos;s <span className="gradient-text">in use</span>
        </h1>
      </header>

      {params.message && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {params.message}
        </p>
      )}

      {list.length === 0 ? (
        <GlassCard className="p-8 text-center text-white/60">
          No equipment listed yet. Gym owners can add zones from the Owner dashboard.
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((eq) => {
            const usage = usageByEquip.get(eq.id);
            const busy = !!usage;
            return (
              <GlassCard key={eq.id} hover className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{eq.name}</p>
                    <p className="text-xs text-white/50">{eq.zone}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      busy
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {busy ? "In use" : "Available"}
                  </span>
                </div>
                <div className="mt-3">
                  {busy && usage?.user_id === user?.id ? (
                    <form action={releaseEquipment}>
                      <input type="hidden" name="usage_id" value={usage.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Release
                      </Button>
                    </form>
                  ) : !busy ? (
                    <form action={claimEquipment}>
                      <input type="hidden" name="equipment_id" value={eq.id} />
                      <Button type="submit" variant="primary" size="sm">
                        Claim
                      </Button>
                    </form>
                  ) : null}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
