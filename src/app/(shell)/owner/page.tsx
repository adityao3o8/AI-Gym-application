import type { Metadata } from "next";
import { Activity, Building2, Crown, Users } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
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

export default async function OwnerPage() {
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
  const sevenDaysAgo = new Date(
    new Date().setDate(new Date().getDate() - 7)
  ).toISOString();

  const [membersRes, workoutsRes, attendanceRes, topRes] = await Promise.all([
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
    </div>
  );
}
