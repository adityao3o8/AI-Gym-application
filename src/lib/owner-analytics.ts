/** Owner dashboard: heatmap + churn helpers. */

export type HeatmapCell = { day: number; hour: number; count: number };
export type HeatmapData = { cells: HeatmapCell[]; peakLabel: string };

export function buildAttendanceHeatmap(
  timestamps: string[]
): HeatmapData {
  const grid = new Map<string, number>();
  for (const iso of timestamps) {
    const d = new Date(iso);
    const key = `${d.getDay()}-${d.getHours()}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = [];
  let peak = { day: 0, hour: 0, count: 0 };
  for (let day = 0; day < 7; day++) {
    for (let hour = 6; hour < 23; hour++) {
      const count = grid.get(`${day}-${hour}`) ?? 0;
      cells.push({ day, hour, count });
      if (count > peak.count) peak = { day, hour, count };
    }
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const peakLabel =
    peak.count > 0
      ? `Busiest: ${days[peak.day]} ${peak.hour}:00–${peak.hour + 1}:00 (${peak.count} check-ins)`
      : "No check-in data yet";

  return { cells, peakLabel };
}

export type ChurnMember = {
  id: string;
  fullName: string | null;
  daysInactive: number;
  lastWorkoutAt: string | null;
  streakCount: number;
};

export function detectChurnRisk(
  members: Array<{
    id: string;
    full_name: string | null;
    last_workout_at: string | null;
    streak_count: number;
  }>,
  inactiveDays = 14
): ChurnMember[] {
  const now = Date.now();
  return members
    .map((m) => {
      const last = m.last_workout_at ? new Date(m.last_workout_at).getTime() : 0;
      const daysInactive = last
        ? Math.floor((now - last) / (24 * 60 * 60 * 1000))
        : 999;
      return {
        id: m.id,
        fullName: m.full_name,
        daysInactive,
        lastWorkoutAt: m.last_workout_at,
        streakCount: m.streak_count,
      };
    })
    .filter((m) => m.daysInactive >= inactiveDays)
    .sort((a, b) => b.daysInactive - a.daysInactive);
}
