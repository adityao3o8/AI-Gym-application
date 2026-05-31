import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeeklyVolume(performedAtList: string[]) {
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";

  const [profileRes, workoutsRes, trophiesRes, recentRes] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, streak_count, last_workout_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("id, performed_at", { count: "exact" })
      .eq("user_id", userId),
    supabase
      .from("user_trophies")
      .select("trophy_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("workouts")
      .select("id, title, performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(6),
  ]);

  const profile = profileRes.data;
  const totalWorkouts = workoutsRes.count ?? workoutsRes.data?.length ?? 0;
  const trophyCount = trophiesRes.count ?? 0;
  const recent = recentRes.data ?? [];

  const weekStart = startOfWeek(new Date());
  const thisWeek = (workoutsRes.data ?? []).filter(
    (w) => new Date(w.performed_at) >= weekStart
  ).length;

  const weekly = buildWeeklyVolume(
    (workoutsRes.data ?? []).map((w) => w.performed_at)
  );

  const firstName =
    profile?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Athlete";

  return (
    <DashboardClient
      firstName={firstName}
      stats={{
        workouts: totalWorkouts,
        streak: profile?.streak_count ?? 0,
        trophies: trophyCount,
        thisWeek,
      }}
      recent={recent.map((r) => ({
        id: r.id,
        title: r.title,
        performedAt: r.performed_at,
      }))}
      weekly={weekly}
    />
  );
}
