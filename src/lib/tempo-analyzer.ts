import type { FrameMetrics } from "@/lib/form-analyzer";

export type TempoAnalysis = {
  avgEccentricMs: number | null;
  avgConcentricMs: number | null;
  label: string;
  score: number;
  fatigueDetected: boolean;
  fatigueMessage: string | null;
};

/** Analyze rep tempo and mid-set fatigue from angle time series. */
export function analyzeTempo(
  metrics: FrameMetrics[],
  pickAngle: (m: FrameMetrics) => number | null
): TempoAnalysis {
  const angles = metrics
    .filter((m) => m.visibility >= 0.55)
    .map((m) => ({ ts: m.timestamp, angle: pickAngle(m) }))
    .filter((x): x is { ts: number; angle: number } => x.angle !== null);

  if (angles.length < 10) {
    return {
      avgEccentricMs: null,
      avgConcentricMs: null,
      label: "Insufficient data",
      score: 0,
      fatigueDetected: false,
      fatigueMessage: null,
    };
  }

  const eccentrics: number[] = [];
  const concentrics: number[] = [];
  let descending = false;
  let segmentStart = angles[0].ts;

  for (let i = 1; i < angles.length; i++) {
    const delta = angles[i].angle - angles[i - 1].angle;
    const dt = angles[i].ts - angles[i - 1].ts;
    if (dt <= 0) continue;

    if (delta < -0.5 && !descending) {
      descending = true;
      segmentStart = angles[i - 1].ts;
    } else if (delta > 0.5 && descending) {
      eccentrics.push(angles[i].ts - segmentStart);
      segmentStart = angles[i].ts;
      descending = false;
    } else if (delta > 0.5 && !descending && i > 2) {
      concentrics.push(angles[i].ts - segmentStart);
      segmentStart = angles[i].ts;
    }
  }

  const avgEcc =
    eccentrics.length > 0
      ? eccentrics.reduce((a, b) => a + b, 0) / eccentrics.length
      : null;
  const avgConc =
    concentrics.length > 0
      ? concentrics.reduce((a, b) => a + b, 0) / concentrics.length
      : null;

  let label = "Controlled tempo";
  let score = 70;
  if (avgEcc !== null && avgEcc < 800) {
    label = "Fast descent — try 2–3 sec eccentric";
    score = 45;
  } else if (avgEcc !== null && avgEcc >= 1500) {
    label = "Slow & controlled — great for hypertrophy";
    score = 92;
  } else if (avgEcc !== null) {
    label = "Good tempo control";
    score = 78;
  }

  const third = Math.floor(angles.length / 3);
  const earlyRom =
    Math.max(...angles.slice(0, third).map((a) => a.angle)) -
    Math.min(...angles.slice(0, third).map((a) => a.angle));
  const lateRom =
    Math.max(...angles.slice(-third).map((a) => a.angle)) -
    Math.min(...angles.slice(-third).map((a) => a.angle));
  const fatigueDetected = earlyRom > 0 && lateRom < earlyRom * 0.75;
  const fatigueMessage = fatigueDetected
    ? `Depth/ROM dropped ~${Math.round((1 - lateRom / earlyRom) * 100)}% in later reps — consider stopping the set.`
    : null;

  if (fatigueDetected) score = Math.max(30, score - 20);

  return {
    avgEccentricMs: avgEcc,
    avgConcentricMs: avgConc,
    label,
    score,
    fatigueDetected,
    fatigueMessage,
  };
}
