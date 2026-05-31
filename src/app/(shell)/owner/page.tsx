import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, Building2, Crown, Users } from "lucide-react";

import { createChallenge, setupGym } from "@/app/actions/features";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { buildAttendanceHeatmap, detectChurnRisk } from "@/lib/owner-analytics";
import { createClient } from "@/lib/supabase/server";
import {
  WeeklyVolumeChart,
  type WeeklyPoint,
} from "@/components/charts/weekly-volume-chart";

export const metadata: Metadata = {
  title: "Owner",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekly(performedAtList: string[]): WeeklyPoint[] {
  const weeks: { label: string; workouts: number; start: Date }[] = [];
  const today = startOfWeek(new Date());
  for (let i = 7; i >= 0; i--) {
    const s = new Date(today);
    s.setDate(s.getDate() - i * 7);
    weeks.push({
      start: s,
      label: s.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      workouts: 0,
    });
  }
  for (const iso of performedAtList) {
    const d = new Date(iso);
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (d >= weeks[i].start) {
        weeks[i].workouts += 1;
        break;
      }
    }
  }
  return weeks.map(({ label, workouts }) => ({ label, workouts }));
}

type OwnerPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function OwnerPage({ searchParams }: OwnerPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("role, gym_id, full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const isStaff = profile?.role === "owner" || profile?.role === "admin";

  if (!isStaff) {
    return (
      <div className="relative mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <GlassCard className="p-8 text-center">
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Crown className="size-6 text-apple-purple" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Owners only</h1>
          <p className="mt-2 text-white/60">
            This dashboard is reserved for gym owners and admins. Your account is
            registered as a member.
          </p>
        </GlassCard>
      </div>
    );
  }

  const gymId = profile?.gym_id;

  if (!gymId) {
    return (
      <div className="relative mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <GlassCard className="p-8">
          <Crown className="mb-3 size-8 text-apple-purple" />
          <h1 className="text-2xl font-semibold text-white">Set up your gym</h1>
          <p className="mt-2 text-white/60">
            Create your gym to unlock heatmaps, churn radar, challenges & equipment.
          </p>
          <form action={setupGym} className="mt-6 space-y-3">
            <input
              name="gym_name"
              placeholder="Gym name"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white"
            />
            <input
              name="check_in_code"
              placeholder="Check-in code (optional)"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white"
            />
            <Button type="submit" variant="primary" className="w-full">
              Create gym
            </Button>
          </form>
        </GlassCard>
      </div>
    );
  }

  const sevenDaysAgo = new Date(
    new Date().setDate(new Date().getDate() - 7)
  ).toISOString();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [membersRes, workoutsRes, attendanceRes, topRes, allMembersRes, checkInTimesRes, gymRes] =
    await Promise.all([
    gymId
      ? supabase
          .from("users")
          .select("id, full_name, streak_count, last_workout_at", {
            count: "exact",
          })
          .eq("gym_id", gymId)
      : Promise.resolve({ data: [], count: 0 } as unknown as Awaited<
          ReturnType<typeof supabase.from>
        >),
    gymId
      ? supabase
          .from("workouts")
          .select("id, performed_at", { count: "exact" })
          .eq("gym_id", gymId)
      : Promise.resolve({ data: [], count: 0 } as unknown as Awaited<
          ReturnType<typeof supabase.from>
        >),
    gymId
      ? supabase
          .from("attendance")
          .select("id, checked_in_at", { count: "exact" })
          .eq("gym_id", gymId)
          .gte("checked_in_at", sevenDaysAgo)
      : Promise.resolve({ data: [], count: 0 } as unknown as Awaited<
          ReturnType<typeof supabase.from>
        >),
    gymId
      ? supabase
          .from("users")
          .select("full_name, streak_count")
          .eq("gym_id", gymId)
          .order("streak_count", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] } as unknown as Awaited<
          ReturnType<typeof supabase.from>
        >),
    gymId
      ? supabase
          .from("users")
          .select("id, full_name, last_workout_at, streak_count")
          .eq("gym_id", gymId)
      : Promise.resolve({ data: [] }),
    gymId
      ? supabase
          .from("attendance")
          .select("checked_in_at")
          .eq("gym_id", gymId)
          .gte("checked_in_at", thirtyDaysAgo.toISOString())
      : Promise.resolve({ data: [] }),
    supabase.from("gyms").select("name, check_in_code").eq("id", gymId).single(),
  ]);

  type CountResult = { data: unknown[] | null; count: number | null };
  const members = (membersRes as unknown as CountResult).count ?? 0;
  const workoutsCount = (workoutsRes as unknown as CountResult).count ?? 0;
  const attendanceCount = (attendanceRes as unknown as CountResult).count ?? 0;

  type WorkoutRow = { performed_at: string };
  type TopRow = { full_name: string | null; streak_count: number };
  const workoutsList = ((workoutsRes as unknown as { data: WorkoutRow[] | null }).data ?? []);
  const top = ((topRes as unknown as { data: TopRow[] | null }).data ?? []);

  const weekly = buildWeekly(workoutsList.map((w) => w.performed_at));

  const checkInTimes = ((checkInTimesRes as { data: { checked_in_at: string }[] | null }).data ?? []).map(
    (c) => c.checked_in_at
  );
  const heatmap = buildAttendanceHeatmap(checkInTimes);
  const churn = detectChurnRisk(
    (allMembersRes.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      last_workout_at: string | null;
      streak_count: number;
    }>
  );
  const gymInfo = gymRes.data;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxHeat = Math.max(1, ...heatmap.cells.map((c) => c.count));

  const cards = [
    { label: "Members", value: members, icon: Users, glow: "blue" as const },
    {
      label: "Workouts (all-time)",
      value: workoutsCount,
      icon: Activity,
      glow: "purple" as const,
    },
    {
      label: "Check-ins (7d)",
      value: attendanceCount,
      icon: Building2,
      glow: "teal" as const,
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Crown className="size-4 text-apple-purple" />
          Owner analytics
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your gym at a <span className="gradient-text">glance</span>
        </h1>
        <p className="mt-2 text-white/60">
          {gymId
            ? "Live insights for your gym, sourced from member activity."
            : "Your account has no gym linked yet. Once linked, this view will populate."}
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

      {gymInfo?.check_in_code && (
        <p className="mb-4 text-sm text-white/60">
          Member check-in code:{" "}
          <strong className="text-white">{gymInfo.check_in_code}</strong> ·{" "}
          <Link href="/equipment" className="text-apple-blue">
            Equipment queue
          </Link>
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((stat) => (
          <GlassCard key={stat.label} hover glow={stat.glow} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                <stat.icon className="size-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-white/60">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold text-white">{stat.value}</p>
          </GlassCard>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <p className="text-sm text-white/60">Gym workout volume</p>
          <p className="mb-3 text-lg font-semibold text-white">Past 8 weeks</p>
          <WeeklyVolumeChart data={weekly} />
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-sm text-white/60">Top streaks</p>
          <p className="mb-3 text-lg font-semibold text-white">Most consistent</p>
          {top.length === 0 ? (
            <p className="text-sm text-white/50">No active members yet.</p>
          ) : (
            <ul className="space-y-2">
              {top.map((m, i) => (
                <li
                  key={`${m.full_name}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white">
                    {m.full_name ?? "Anonymous"}
                  </span>
                  <span className="text-white/60">{m.streak_count} days</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <p className="text-sm text-white/60">Floor heatmap</p>
          <p className="mb-2 text-lg font-semibold text-white">Check-in busy hours</p>
          <p className="mb-3 text-xs text-white/50">{heatmap.peakLabel}</p>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "32px repeat(17, 1fr)" }}>
              <div />
              {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                <div key={h} className="text-center text-[9px] text-white/30">
                  {h}
                </div>
              ))}
              {days.map((day, di) => (
                <div key={day} className="contents">
                  <div className="text-[10px] text-white/40">{day}</div>
                  {Array.from({ length: 17 }, (_, i) => i + 6).map((hour) => {
                    const cell = heatmap.cells.find((c) => c.day === di && c.hour === hour);
                    const intensity = (cell?.count ?? 0) / maxHeat;
                    return (
                      <div
                        key={`${di}-${hour}`}
                        className="size-3 rounded-sm"
                        style={{
                          backgroundColor: `rgba(41,151,255,${0.08 + intensity * 0.85})`,
                        }}
                        title={`${cell?.count ?? 0} check-ins`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="flex items-center gap-2 text-sm text-white/60">
            <AlertTriangle className="size-4 text-amber-400" /> Churn radar
          </p>
          <p className="mb-3 text-lg font-semibold text-white">Reach out list</p>
          {churn.length === 0 ? (
            <p className="text-sm text-white/50">All members active in the last 14 days.</p>
          ) : (
            <ul className="space-y-2">
              {churn.slice(0, 6).map((m) => (
                <li
                  key={m.id}
                  className="flex justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <span className="text-white">{m.fullName ?? "Member"}</span>
                  <span className="text-amber-200">{m.daysInactive}d inactive</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <p className="text-lg font-semibold text-white">Create challenge</p>
          <form action={createChallenge} className="mt-3 space-y-2">
            <input
              name="title"
              placeholder="Challenge title"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
            />
            <input
              name="target_value"
              type="number"
              placeholder="Target workouts"
              defaultValue={5}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
            />
            <input
              name="days"
              type="number"
              placeholder="Duration (days)"
              defaultValue={14}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
            />
            <Button type="submit" variant="primary" size="sm">
              Launch challenge
            </Button>
          </form>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-lg font-semibold text-white">Quick links</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/community" className="text-apple-blue hover:underline">
                Community feed & Hall of Fame
              </Link>
            </li>
            <li>
              <Link href="/equipment" className="text-apple-blue hover:underline">
                Equipment queue management
              </Link>
            </li>
            <li>
              <Link href="/check-in" className="text-apple-blue hover:underline">
                Test member check-in
              </Link>
            </li>
          </ul>
        </GlassCard>
      </section>
    </div>
  );
}
