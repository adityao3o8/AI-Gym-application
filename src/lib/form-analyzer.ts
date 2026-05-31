/**
 * Form analyzer for workout videos.
 *
 * Takes a stream of pose landmarks (33 keypoints in MediaPipe Pose order)
 * and computes joint angles, rep counts, and exercise-specific form tips.
 */

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
  backAngleDeg: number | null; // angle vs vertical
  elbowAngle: number | null;
  visibility: number; // 0-1, average over key joints used by the active exercise
};

export type ExerciseSummary = {
  primaryLabel: string; // e.g. "Min knee"
  primaryValue: string; // e.g. "92°"
  secondaryLabel: string;
  secondaryValue: string;
};

export type AnalysisResult = {
  exercise: Exercise;
  reps: number;
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
  return rv > lv ? "right" : "left";
}

const LOWER = new Set<Exercise>(["squat", "deadlift"]);

export function computeFrameMetrics(
  landmarks: Landmark[],
  timestamp: number,
  exercise: Exercise
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
  const side = pickSide(landmarks, exercise);
  const S = side === "right" ? POSE.RIGHT_SHOULDER : POSE.LEFT_SHOULDER;
  const E = side === "right" ? POSE.RIGHT_ELBOW : POSE.LEFT_ELBOW;
  const W = side === "right" ? POSE.RIGHT_WRIST : POSE.LEFT_WRIST;
  const H = side === "right" ? POSE.RIGHT_HIP : POSE.LEFT_HIP;
  const K = side === "right" ? POSE.RIGHT_KNEE : POSE.LEFT_KNEE;
  const A = side === "right" ? POSE.RIGHT_ANKLE : POSE.LEFT_ANKLE;

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

// Per-exercise rep counting using hysteresis on the most relevant joint angle.
type RepConfig = {
  pick: (m: FrameMetrics) => number | null;
  descendBelow: number;
  ascendAbove: number;
};

const REP_CONFIGS: Record<Exercise, RepConfig> = {
  squat: { pick: (m) => m.kneeAngle, descendBelow: 110, ascendAbove: 160 },
  deadlift: { pick: (m) => m.hipAngle, descendBelow: 130, ascendAbove: 170 },
  bench: { pick: (m) => m.elbowAngle, descendBelow: 90, ascendAbove: 155 },
  overhead: { pick: (m) => m.elbowAngle, descendBelow: 95, ascendAbove: 165 },
  pullup: { pick: (m) => m.elbowAngle, descendBelow: 70, ascendAbove: 150 },
};

type RepState = { inRep: boolean; reps: number };

export function createRepCounter(exercise: Exercise) {
  const cfg = REP_CONFIGS[exercise];
  const state: RepState = { inRep: false, reps: 0 };

  function update(m: FrameMetrics) {
    const v = cfg.pick(m);
    if (v === null) return state.reps;
    if (!state.inRep && v < cfg.descendBelow) {
      state.inRep = true;
    } else if (state.inRep && v > cfg.ascendAbove) {
      state.reps += 1;
      state.inRep = false;
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
  if (exercise === "squat") {
    const knees = metrics
      .map((m) => m.kneeAngle)
      .filter((v): v is number => v !== null);
    const backs = metrics
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
    const hips = metrics
      .map((m) => m.hipAngle)
      .filter((v): v is number => v !== null);
    const backs = metrics
      .map((m) => m.backAngleDeg)
      .filter((v): v is number => v !== null);
    return {
      primaryLabel: "Min hip",
      primaryValue: fmtAngle(hips.length ? Math.min(...hips) : null),
      secondaryLabel: "Max tilt",
      secondaryValue: fmtAngle(backs.length ? Math.max(...backs) : null),
    };
  }
  // bench / overhead / pullup → elbow ROM
  const elbows = metrics
    .map((m) => m.elbowAngle)
    .filter((v): v is number => v !== null);
  return {
    primaryLabel: "Min elbow",
    primaryValue: fmtAngle(elbows.length ? Math.min(...elbows) : null),
    secondaryLabel: "Max elbow",
    secondaryValue: fmtAngle(elbows.length ? Math.max(...elbows) : null),
  };
}

const MIN_VISIBILITY = 0.55;
const MIN_GOOD_FRAME_RATIO = 0.3;

export function summarize(
  exercise: Exercise,
  metrics: FrameMetrics[]
): AnalysisResult {
  const counter = createRepCounter(exercise);
  for (const m of metrics) counter.update(m);
  const summary = summaryFor(exercise, metrics);

  const totalFrames = metrics.length;
  const goodFrames = metrics.filter((m) => m.visibility >= MIN_VISIBILITY).length;
  const tips: Tip[] = [];

  // Guard: not enough confidence to grade form.
  if (totalFrames === 0) {
    tips.push({
      id: "no-frames",
      severity: "bad",
      message:
        "No frames were analyzed. Make sure the video plays and the page stays focused.",
    });
    return {
      exercise,
      reps: 0,
      tips,
      metrics,
      summary,
      framesWithPose: 0,
      totalFrames: 0,
    };
  }
  if (goodFrames / totalFrames < MIN_GOOD_FRAME_RATIO) {
    tips.push({
      id: "low-visibility",
      severity: "bad",
      message:
        "Couldn't see your body clearly enough to grade form. Re-record from the side with your full body in frame and good lighting.",
    });
    return {
      exercise,
      reps: counter.state.reps,
      tips,
      metrics,
      summary,
      framesWithPose: goodFrames,
      totalFrames,
    };
  }

  if (exercise === "squat") {
    const knees = metrics
      .map((m) => m.kneeAngle)
      .filter((v): v is number => v !== null);
    const backs = metrics
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
        message: `Squat depth is shallow (min knee ${minKnee.toFixed(0)}°). Aim for at least 90° for proper depth.`,
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

    if (counter.state.reps === 0 && knees.length > 0) {
      tips.push({
        id: "reps-zero",
        severity: "warn",
        message:
          "No clean reps detected. Make sure you descend below parallel and stand fully.",
      });
    }
  } else if (exercise === "deadlift") {
    const hips = metrics
      .map((m) => m.hipAngle)
      .filter((v): v is number => v !== null);
    const backs = metrics
      .map((m) => m.backAngleDeg)
      .filter((v): v is number => v !== null);
    const minHip = hips.length ? Math.min(...hips) : null;
    const maxHip = hips.length ? Math.max(...hips) : null;
    const maxBack = backs.length ? Math.max(...backs) : null;

    if (minHip === null) {
      tips.push({
        id: "no-hip",
        severity: "warn",
        message: "Couldn't read your hip angle. Record from the side with your full body in frame.",
      });
    } else {
      if (maxHip !== null && maxHip < 165) {
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

    if (counter.state.reps === 0 && hips.length > 0) {
      tips.push({
        id: "dl-reps-zero",
        severity: "warn",
        message:
          "No clean reps detected. Pull the bar to a full lockout and reset between reps.",
      });
    }
  } else if (exercise === "bench") {
    const elbows = metrics
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
      } else {
        tips.push({
          id: "bench-lockout-ok",
          severity: "ok",
          message: "Good lockout at the top.",
        });
      }
    }
  } else if (exercise === "overhead") {
    const elbows = metrics
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

  return {
    exercise,
    reps: counter.state.reps,
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
