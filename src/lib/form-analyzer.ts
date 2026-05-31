/**
 * Form analyzer for workout videos.
 *
 * Takes a stream of pose landmarks (33 keypoints in MediaPipe Pose order)
 * and computes joint angles, rep counts, and exercise-specific form tips.
 */

import { analyzeTempo } from "@/lib/tempo-analyzer";

export type Landmark = { x: number; y: number; z: number; visibility?: number };

export type Exercise = "squat" | "bench" | "deadlift" | "overhead" | "pullup";

export type Severity = "ok" | "warn" | "bad";

export type Tip = {
  id: string;
  message: string;
  severity: Severity;
};

export type FrameMetrics = {
  timestamp: number;
  kneeAngle: number | null;
  hipAngle: number | null;
  backAngleDeg: number | null;
  elbowAngle: number | null;
  visibility: number;
};

export type ExerciseSummary = {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
};

export type RepConfidence = "high" | "medium" | "low";

export type AnalysisResult = {
  exercise: Exercise;
  detectedExercise: Exercise | null;
  reps: number;
  repConfidence: RepConfidence;
  trackingQuality: number;
  formScore: number;
  tempo: { label: string; score: number; fatigueMessage: string | null };
  tips: Tip[];
  metrics: FrameMetrics[];
  summary: ExerciseSummary;
  framesWithPose: number;
  totalFrames: number;
};

// MediaPipe Pose Landmarker indices (BlazePose 33 keypoints)
export const POSE = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export const MIN_VISIBILITY = 0.6;
const MIN_GOOD_FRAME_RATIO = 0.35;
const SMOOTH_ALPHA = 0.28;
const MIN_HOLD_FRAMES = 5;
const MIN_REP_INTERVAL_MS = 700;
const MIN_ROM_DEG = 25;

function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAB = Math.sqrt(abx * abx + aby * aby);
  const magCB = Math.sqrt(cbx * cbx + cby * cby);
  if (magAB === 0 || magCB === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function torsoTilt(shoulder: Landmark, hip: Landmark): number {
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  const rad = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (rad * 180) / Math.PI;
}

function avgVisibility(points: Array<Landmark | undefined>) {
  let sum = 0;
  let n = 0;
  for (const p of points) {
    if (!p) continue;
    sum += p.visibility ?? 0;
    n += 1;
  }
  return n === 0 ? 0 : sum / n;
}

function pickSide(landmarks: Landmark[], exercise: Exercise) {
  const lower = ["squat", "deadlift"].includes(exercise);
  const left = lower
    ? [POSE.LEFT_HIP, POSE.LEFT_KNEE, POSE.LEFT_ANKLE, POSE.LEFT_SHOULDER]
    : [POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW, POSE.LEFT_WRIST];
  const right = lower
    ? [POSE.RIGHT_HIP, POSE.RIGHT_KNEE, POSE.RIGHT_ANKLE, POSE.RIGHT_SHOULDER]
    : [POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST];
  const lv = avgVisibility(left.map((i) => landmarks[i]));
  const rv = avgVisibility(right.map((i) => landmarks[i]));
  return rv > lv ? ("right" as const) : ("left" as const);
}

/** Lock to one body side for the whole clip to avoid angle jumps. */
export function resolveTrackingSide(
  landmarks: Landmark[],
  exercise: Exercise,
  current: "left" | "right" | null
): "left" | "right" {
  if (current) return current;
  return pickSide(landmarks, exercise);
}

const LOWER = new Set<Exercise>(["squat", "deadlift"]);

export function computeFrameMetrics(
  landmarks: Landmark[],
  timestamp: number,
  exercise: Exercise,
  side?: "left" | "right"
): FrameMetrics {
  if (!landmarks || landmarks.length < 33) {
    return {
      timestamp,
      kneeAngle: null,
      hipAngle: null,
      backAngleDeg: null,
      elbowAngle: null,
      visibility: 0,
    };
  }
  const tracked = side ?? pickSide(landmarks, exercise);
  const S = tracked === "right" ? POSE.RIGHT_SHOULDER : POSE.LEFT_SHOULDER;
  const E = tracked === "right" ? POSE.RIGHT_ELBOW : POSE.LEFT_ELBOW;
  const W = tracked === "right" ? POSE.RIGHT_WRIST : POSE.LEFT_WRIST;
  const H = tracked === "right" ? POSE.RIGHT_HIP : POSE.LEFT_HIP;
  const K = tracked === "right" ? POSE.RIGHT_KNEE : POSE.LEFT_KNEE;
  const A = tracked === "right" ? POSE.RIGHT_ANKLE : POSE.LEFT_ANKLE;

  const shoulder = landmarks[S];
  const elbow = landmarks[E];
  const wrist = landmarks[W];
  const hip = landmarks[H];
  const knee = landmarks[K];
  const ankle = landmarks[A];

  const kneeAngle = hip && knee && ankle ? angle(hip, knee, ankle) : null;
  const hipAngle = shoulder && hip && knee ? angle(shoulder, hip, knee) : null;
  const backAngleDeg = shoulder && hip ? torsoTilt(shoulder, hip) : null;
  const elbowAngle =
    shoulder && elbow && wrist ? angle(shoulder, elbow, wrist) : null;

  const keyPoints = LOWER.has(exercise)
    ? [shoulder, hip, knee, ankle]
    : [shoulder, elbow, wrist];
  const visibility = avgVisibility(keyPoints);

  return {
    timestamp,
    kneeAngle,
    hipAngle,
    backAngleDeg,
    elbowAngle,
    visibility,
  };
}

type RepConfig = {
  pick: (m: FrameMetrics) => number | null;
  /** Default hysteresis when adaptive thresholds can't be computed. */
  descendBelow: number;
  ascendAbove: number;
};

const REP_CONFIGS: Record<Exercise, RepConfig> = {
  squat: { pick: (m) => m.kneeAngle, descendBelow: 105, ascendAbove: 155 },
  deadlift: { pick: (m) => m.hipAngle, descendBelow: 125, ascendAbove: 165 },
  bench: { pick: (m) => m.elbowAngle, descendBelow: 85, ascendAbove: 158 },
  overhead: { pick: (m) => m.elbowAngle, descendBelow: 90, ascendAbove: 162 },
  pullup: { pick: (m) => m.elbowAngle, descendBelow: 65, ascendAbove: 155 },
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

function smoothSeries(values: number[], alpha = SMOOTH_ALPHA): number[] {
  const out: number[] = [];
  let prev: number | null = null;
  for (const v of values) {
    prev = prev === null ? v : alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

type Thresholds = { descendBelow: number; ascendAbove: number };

function adaptiveThresholds(angles: number[]): Thresholds | null {
  if (angles.length < 12) return null;
  const sorted = [...angles].sort((a, b) => a - b);
  const lo = percentile(sorted, 0.12);
  const hi = percentile(sorted, 0.88);
  const range = hi - lo;
  if (range < MIN_ROM_DEG) return null;
  return {
    descendBelow: lo + range * 0.3,
    ascendAbove: lo + range * 0.72,
  };
}

type RepCountResult = { reps: number; romRange: number | null };

function countRepsOnSeries(
  timestamps: number[],
  angles: number[],
  thresholds: Thresholds,
  minRepIntervalMs = MIN_REP_INTERVAL_MS
): RepCountResult {
  if (angles.length < 2) return { reps: 0, romRange: null };

  const sorted = [...angles].sort((a, b) => a - b);
  const romRange = percentile(sorted, 0.88) - percentile(sorted, 0.12);

  let phase: "top" | "bottom" = "top";
  let hold = 0;
  let reps = 0;
  let lastRepTime = -Infinity;

  for (let i = 0; i < angles.length; i++) {
    const v = angles[i];
    const ts = timestamps[i];

    if (phase === "top") {
      if (v < thresholds.descendBelow) {
        hold += 1;
        if (hold >= MIN_HOLD_FRAMES) {
          phase = "bottom";
          hold = 0;
        }
      } else {
        hold = 0;
      }
    } else if (v > thresholds.ascendAbove) {
      hold += 1;
      if (hold >= MIN_HOLD_FRAMES && ts - lastRepTime >= minRepIntervalMs) {
        reps += 1;
        lastRepTime = ts;
        phase = "top";
        hold = 0;
      }
    } else {
      hold = 0;
    }
  }

  return { reps, romRange };
}

function countRepsFromMetrics(
  exercise: Exercise,
  metrics: FrameMetrics[]
): RepCountResult {
  const cfg = REP_CONFIGS[exercise];
  const good = metrics.filter(
    (m) => m.visibility >= MIN_VISIBILITY && cfg.pick(m) !== null
  );
  if (good.length < 8) return { reps: 0, romRange: null };

  const timestamps = good.map((m) => m.timestamp);
  const rawAngles = good.map((m) => cfg.pick(m)!);
  const angles = smoothSeries(rawAngles);

  const adaptive = adaptiveThresholds(angles);
  const thresholds = adaptive ?? cfg;
  return countRepsOnSeries(timestamps, angles, thresholds);
}

function repConfidenceLabel(
  trackingQuality: number,
  romRange: number | null,
  reps: number,
  goodFrameCount: number
): RepConfidence {
  if (goodFrameCount < 10 || trackingQuality < 0.35) return "low";
  if (romRange !== null && romRange < MIN_ROM_DEG) return "low";
  if (trackingQuality >= 0.65 && romRange !== null && romRange >= MIN_ROM_DEG + 10) {
    return reps > 0 ? "high" : "medium";
  }
  if (trackingQuality >= 0.45) return "medium";
  return "low";
}

type RepState = {
  inRep: boolean;
  reps: number;
  smoothed: number | null;
  hold: number;
  lastRepTime: number;
  thresholds: Thresholds;
};

export function createRepCounter(exercise: Exercise) {
  const cfg = REP_CONFIGS[exercise];
  const state: RepState = {
    inRep: false,
    reps: 0,
    smoothed: null,
    hold: 0,
    lastRepTime: -Infinity,
    thresholds: cfg,
  };

  /** Recalibrate thresholds once enough samples exist (mid-clip). */
  function maybeRecalibrate(samples: number[]) {
    if (samples.length < 20) return;
    const adaptive = adaptiveThresholds(samples);
    if (adaptive) state.thresholds = adaptive;
  }

  const angleSamples: number[] = [];

  function update(m: FrameMetrics) {
    if (m.visibility < MIN_VISIBILITY) return state.reps;

    const raw = cfg.pick(m);
    if (raw === null) return state.reps;

    state.smoothed =
      state.smoothed === null
        ? raw
        : SMOOTH_ALPHA * raw + (1 - SMOOTH_ALPHA) * state.smoothed;
    const v = state.smoothed;

    angleSamples.push(v);
    if (angleSamples.length > 60) angleSamples.shift();
    maybeRecalibrate(angleSamples);

    const { descendBelow, ascendAbove } = state.thresholds;

    if (!state.inRep) {
      if (v < descendBelow) {
        state.hold += 1;
        if (state.hold >= MIN_HOLD_FRAMES) {
          state.inRep = true;
          state.hold = 0;
        }
      } else {
        state.hold = 0;
      }
    } else if (v > ascendAbove) {
      state.hold += 1;
      if (
        state.hold >= MIN_HOLD_FRAMES &&
        m.timestamp - state.lastRepTime >= MIN_REP_INTERVAL_MS
      ) {
        state.reps += 1;
        state.lastRepTime = m.timestamp;
        state.inRep = false;
        state.hold = 0;
      }
    } else {
      state.hold = 0;
    }

    return state.reps;
  }

  return { update, state };
}

function fmtAngle(v: number | null) {
  return v === null ? "—" : `${v.toFixed(0)}°`;
}

function summaryFor(
  exercise: Exercise,
  metrics: FrameMetrics[]
): ExerciseSummary {
  const good = metrics.filter((m) => m.visibility >= MIN_VISIBILITY);

  if (exercise === "squat") {
    const knees = good
      .map((m) => m.kneeAngle)
      .filter((v): v is number => v !== null);
    const backs = good
      .map((m) => m.backAngleDeg)
      .filter((v): v is number => v !== null);
    return {
      primaryLabel: "Min knee",
      primaryValue: fmtAngle(knees.length ? Math.min(...knees) : null),
      secondaryLabel: "Max tilt",
      secondaryValue: fmtAngle(backs.length ? Math.max(...backs) : null),
    };
  }
  if (exercise === "deadlift") {
    const hips = good
      .map((m) => m.hipAngle)
      .filter((v): v is number => v !== null);
    const backs = good
      .map((m) => m.backAngleDeg)
      .filter((v): v is number => v !== null);
    return {
      primaryLabel: "Min hip",
      primaryValue: fmtAngle(hips.length ? Math.min(...hips) : null),
      secondaryLabel: "Max tilt",
      secondaryValue: fmtAngle(backs.length ? Math.max(...backs) : null),
    };
  }
  const elbows = good
    .map((m) => m.elbowAngle)
    .filter((v): v is number => v !== null);
  return {
    primaryLabel: "Min elbow",
    primaryValue: fmtAngle(elbows.length ? Math.min(...elbows) : null),
    secondaryLabel: "Max elbow",
    secondaryValue: fmtAngle(elbows.length ? Math.max(...elbows) : null),
  };
}

function anglePicker(exercise: Exercise): (m: FrameMetrics) => number | null {
  const cfg = REP_CONFIGS[exercise];
  return cfg.pick;
}

function detectExerciseFromMetrics(metrics: FrameMetrics[]): Exercise | null {
  const sample = metrics.filter((m) => m.visibility >= 0.5).slice(0, 30);
  if (sample.length < 8) return null;
  const rom = (values: Array<number | null>) => {
    const nums = values.filter((v): v is number => v !== null);
    if (nums.length < 3) return 0;
    return Math.max(...nums) - Math.min(...nums);
  };
  const kneeRom = rom(sample.map((m) => m.kneeAngle));
  const elbowRom = rom(sample.map((m) => m.elbowAngle));
  const hipRom = rom(sample.map((m) => m.hipAngle));
  const backs = sample
    .map((m) => m.backAngleDeg)
    .filter((v): v is number => v !== null);
  const avgBack =
    backs.length > 0 ? backs.reduce((a, b) => a + b, 0) / backs.length : 0;

  if (kneeRom > 35 && kneeRom >= elbowRom) return "squat";
  if (hipRom > 30 && avgBack > 25 && kneeRom < 25) return "deadlift";
  if (elbowRom > 40 && avgBack < 30) {
    const maxElbow = Math.max(...sample.map((m) => m.elbowAngle ?? 0));
    return maxElbow > 150 ? "overhead" : "bench";
  }
  if (elbowRom > 50 && kneeRom < 15) return "pullup";
  return null;
}

function computeFormScore(
  tips: Tip[],
  trackingQuality: number,
  tempoScore: number
): number {
  let score = 40 + trackingQuality * 35 + tempoScore * 0.25;
  for (const t of tips) {
    if (t.severity === "ok") score += 4;
    if (t.severity === "warn") score -= 7;
    if (t.severity === "bad") score -= 14;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

const EMPTY_TEMPO = {
  label: "—",
  score: 0,
  fatigueMessage: null as string | null,
};

export function summarize(
  exercise: Exercise,
  metrics: FrameMetrics[]
): AnalysisResult {
  const summary = summaryFor(exercise, metrics);

  const totalFrames = metrics.length;
  const goodFrames = metrics.filter((m) => m.visibility >= MIN_VISIBILITY).length;
  const trackingQuality =
    totalFrames === 0 ? 0 : goodFrames / totalFrames;

  const { reps, romRange } = countRepsFromMetrics(exercise, metrics);
  const repConfidence = repConfidenceLabel(
    trackingQuality,
    romRange,
    reps,
    goodFrames
  );

  const tips: Tip[] = [];

  if (totalFrames === 0) {
    tips.push({
      id: "no-frames",
      severity: "bad",
      message:
        "No frames were analyzed. Make sure the video plays and the page stays focused.",
    });
    return {
      exercise,
      detectedExercise: null,
      reps: 0,
      repConfidence: "low",
      trackingQuality: 0,
      formScore: 0,
      tempo: EMPTY_TEMPO,
      tips,
      metrics,
      summary,
      framesWithPose: 0,
      totalFrames: 0,
    };
  }

  if (trackingQuality < MIN_GOOD_FRAME_RATIO) {
    tips.push({
      id: "low-visibility",
      severity: "bad",
      message: `Body was only visible in ${Math.round(trackingQuality * 100)}% of frames. Re-record from the side with your full body in frame, steady camera, and good lighting.`,
    });
    return {
      exercise,
      detectedExercise: detectExerciseFromMetrics(metrics),
      reps,
      repConfidence: "low",
      trackingQuality,
      formScore: 0,
      tempo: EMPTY_TEMPO,
      tips,
      metrics,
      summary,
      framesWithPose: goodFrames,
      totalFrames,
    };
  }

  if (repConfidence === "low" && romRange !== null && romRange < MIN_ROM_DEG) {
    tips.push({
      id: "low-rom",
      severity: "warn",
      message: `Range of motion was too small to count reps reliably (${romRange.toFixed(0)}° detected). Use a side view and perform full reps.`,
    });
  } else if (repConfidence === "high") {
    tips.push({
      id: "tracking-ok",
      severity: "ok",
      message: `Tracking quality is strong (${Math.round(trackingQuality * 100)}% of frames). Rep count should be accurate.`,
    });
  } else {
    tips.push({
      id: "tracking-medium",
      severity: "warn",
      message: `Tracking was partial (${Math.round(trackingQuality * 100)}% of frames). Rep count is an estimate — verify against your video.`,
    });
  }

  if (exercise === "squat") {
    const knees = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.kneeAngle)
      .filter((v): v is number => v !== null);
    const backs = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.backAngleDeg)
      .filter((v): v is number => v !== null);
    const minKnee = knees.length ? Math.min(...knees) : null;
    const maxBack = backs.length ? Math.max(...backs) : null;

    if (minKnee === null) {
      tips.push({
        id: "no-knee",
        severity: "warn",
        message: "Couldn't read your knee angle. Make sure your full leg is in frame.",
      });
    } else if (minKnee > 110) {
      tips.push({
        id: "depth",
        severity: "bad",
        message: `Squat depth is shallow (min knee ${minKnee.toFixed(0)}°). Aim for at least parallel (~90°).`,
      });
    } else if (minKnee > 95) {
      tips.push({
        id: "depth-warn",
        severity: "warn",
        message: `Almost parallel (min knee ${minKnee.toFixed(0)}°). Try to go slightly deeper.`,
      });
    } else {
      tips.push({
        id: "depth-ok",
        severity: "ok",
        message: `Good depth (min knee ${minKnee.toFixed(0)}°).`,
      });
    }

    if (maxBack !== null) {
      if (maxBack > 55) {
        tips.push({
          id: "back-tilt",
          severity: "bad",
          message: `Excessive forward lean (max torso tilt ${maxBack.toFixed(0)}°). Keep chest up and brace your core.`,
        });
      } else if (maxBack > 40) {
        tips.push({
          id: "back-warn",
          severity: "warn",
          message: `Moderate forward lean (max torso tilt ${maxBack.toFixed(0)}°). Try to keep your torso more upright.`,
        });
      } else {
        tips.push({
          id: "back-ok",
          severity: "ok",
          message: "Torso angle looks controlled.",
        });
      }
    }

    if (reps === 0 && knees.length > 0 && repConfidence !== "low") {
      tips.push({
        id: "reps-zero",
        severity: "warn",
        message:
          "No full reps detected. Descend to parallel and stand fully between reps.",
      });
    }
  } else if (exercise === "deadlift") {
    const hips = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.hipAngle)
      .filter((v): v is number => v !== null);
    const backs = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.backAngleDeg)
      .filter((v): v is number => v !== null);
    const maxHip = hips.length ? Math.max(...hips) : null;
    const maxBack = backs.length ? Math.max(...backs) : null;

    if (hips.length === 0) {
      tips.push({
        id: "no-hip",
        severity: "warn",
        message: "Couldn't read your hip angle. Record from the side with your full body in frame.",
      });
    } else if (maxHip !== null && maxHip < 165) {
      tips.push({
        id: "dl-lockout",
        severity: "warn",
        message: `Not finishing the lockout (max hip ${maxHip.toFixed(0)}°). Stand fully tall, glutes engaged.`,
      });
    } else {
      tips.push({
        id: "dl-lockout-ok",
        severity: "ok",
        message: "Good lockout at the top.",
      });
    }

    if (maxBack !== null) {
      if (maxBack > 65) {
        tips.push({
          id: "dl-back",
          severity: "bad",
          message: `Back looks excessively flexed (max torso tilt ${maxBack.toFixed(0)}°). Reset, brace, and maintain a neutral spine.`,
        });
      } else if (maxBack > 50) {
        tips.push({
          id: "dl-back-warn",
          severity: "warn",
          message: `Significant forward lean (${maxBack.toFixed(0)}°). Keep your chest proud as the bar leaves the floor.`,
        });
      } else {
        tips.push({
          id: "dl-back-ok",
          severity: "ok",
          message: "Back angle looks controlled.",
        });
      }
    }

    if (reps === 0 && hips.length > 0 && repConfidence !== "low") {
      tips.push({
        id: "dl-reps-zero",
        severity: "warn",
        message:
          "No full reps detected. Pull to a full lockout and reset between reps.",
      });
    }
  } else if (exercise === "bench") {
    const elbows = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.elbowAngle)
      .filter((v): v is number => v !== null);
    const minElbow = elbows.length ? Math.min(...elbows) : null;
    const maxElbow = elbows.length ? Math.max(...elbows) : null;
    if (minElbow === null) {
      tips.push({
        id: "no-elbow",
        severity: "warn",
        message: "Couldn't read your arms clearly. Try a 45° camera angle from the foot of the bench.",
      });
    } else {
      if (minElbow > 90) {
        tips.push({
          id: "bench-range",
          severity: "warn",
          message: `Limited range of motion (min elbow ${minElbow.toFixed(0)}°). Lower the bar closer to your chest.`,
        });
      } else {
        tips.push({
          id: "bench-range-ok",
          severity: "ok",
          message: `Good descent depth (min elbow ${minElbow.toFixed(0)}°).`,
        });
      }
      if (maxElbow !== null && maxElbow < 160) {
        tips.push({
          id: "bench-lockout",
          severity: "warn",
          message: "Not locking out at the top. Press to full extension.",
        });
      } else if (maxElbow !== null) {
        tips.push({
          id: "bench-lockout-ok",
          severity: "ok",
          message: "Good lockout at the top.",
        });
      }
    }
  } else if (exercise === "overhead") {
    const elbows = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.elbowAngle)
      .filter((v): v is number => v !== null);
    const maxElbow = elbows.length ? Math.max(...elbows) : null;
    const minElbow = elbows.length ? Math.min(...elbows) : null;
    if (maxElbow === null) {
      tips.push({
        id: "no-elbow",
        severity: "warn",
        message: "Couldn't read your arms clearly. Record from the side with your full body in frame.",
      });
    } else {
      if (maxElbow < 165) {
        tips.push({
          id: "ohp-lockout",
          severity: "warn",
          message: `Press doesn't reach full lockout (max elbow ${maxElbow.toFixed(0)}°).`,
        });
      } else {
        tips.push({
          id: "ohp-lockout-ok",
          severity: "ok",
          message: "Good lockout overhead.",
        });
      }
      if (minElbow !== null && minElbow > 100) {
        tips.push({
          id: "ohp-range",
          severity: "warn",
          message: `Short range of motion (min elbow ${minElbow.toFixed(0)}°). Bring the bar lower at the start of the press.`,
        });
      }
    }
  } else if (exercise === "pullup") {
    const elbows = metrics
      .filter((m) => m.visibility >= MIN_VISIBILITY)
      .map((m) => m.elbowAngle)
      .filter((v): v is number => v !== null);
    const minElbow = elbows.length ? Math.min(...elbows) : null;
    const maxElbow = elbows.length ? Math.max(...elbows) : null;
    if (minElbow === null) {
      tips.push({
        id: "no-elbow",
        severity: "warn",
        message: "Couldn't read your arms clearly. Try a slight angle off the front, full body in frame.",
      });
    } else {
      if (minElbow > 70) {
        tips.push({
          id: "pullup-top",
          severity: "warn",
          message: "Not reaching full pull. Aim for chin above the bar.",
        });
      } else {
        tips.push({
          id: "pullup-top-ok",
          severity: "ok",
          message: "Good pull at the top.",
        });
      }
      if (maxElbow !== null && maxElbow < 160) {
        tips.push({
          id: "pullup-hang",
          severity: "warn",
          message: "Not extending to a full hang between reps.",
        });
      } else if (maxElbow !== null) {
        tips.push({
          id: "pullup-hang-ok",
          severity: "ok",
          message: "Good full hang between reps.",
        });
      }
    }
  }

  const detectedExercise = detectExerciseFromMetrics(metrics);
  const tempoResult = analyzeTempo(metrics, anglePicker(exercise));
  const tempo = {
    label: tempoResult.label,
    score: tempoResult.score,
    fatigueMessage: tempoResult.fatigueMessage,
  };
  if (tempoResult.fatigueDetected && tempoResult.fatigueMessage) {
    tips.push({
      id: "fatigue",
      severity: "warn",
      message: tempoResult.fatigueMessage,
    });
  }
  if (tempoResult.label.includes("Slow")) {
    tips.push({
      id: "tempo-good",
      severity: "ok",
      message: tempoResult.label,
    });
  }

  const formScore = computeFormScore(tips, trackingQuality, tempo.score);

  return {
    exercise,
    detectedExercise,
    reps,
    repConfidence,
    trackingQuality,
    formScore,
    tempo,
    tips,
    metrics,
    summary,
    framesWithPose: goodFrames,
    totalFrames,
  };
}

export const POSE_CONNECTIONS: Array<[number, number]> = [
  [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER],
  [POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW],
  [POSE.LEFT_ELBOW, POSE.LEFT_WRIST],
  [POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW],
  [POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST],
  [POSE.LEFT_SHOULDER, POSE.LEFT_HIP],
  [POSE.RIGHT_SHOULDER, POSE.RIGHT_HIP],
  [POSE.LEFT_HIP, POSE.RIGHT_HIP],
  [POSE.LEFT_HIP, POSE.LEFT_KNEE],
  [POSE.LEFT_KNEE, POSE.LEFT_ANKLE],
  [POSE.RIGHT_HIP, POSE.RIGHT_KNEE],
  [POSE.RIGHT_KNEE, POSE.RIGHT_ANKLE],
];
