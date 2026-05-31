"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  ScanLine,
  Upload,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import {
  POSE_CONNECTIONS,
  computeFrameMetrics,
  createRepCounter,
  summarize,
  type AnalysisResult,
  type Exercise,
  type FrameMetrics,
  type Landmark,
} from "@/lib/form-analyzer";

type LoadState = "idle" | "loading-model" | "ready" | "error";
type RunState = "idle" | "analyzing" | "done";

const EXERCISES: { id: Exercise; label: string; emoji: string }[] = [
  { id: "squat", label: "Squat", emoji: "🦵" },
  { id: "deadlift", label: "Deadlift", emoji: "🏋️" },
  { id: "bench", label: "Bench Press", emoji: "💪" },
  { id: "overhead", label: "Overhead Press", emoji: "🏋️‍♂️" },
  { id: "pullup", label: "Pull-up", emoji: "🤸" },
];

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

type PoseLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { landmarks: Landmark[][] };
  close: () => void;
};

export function FormCheckClient() {
  const [exercise, setExercise] = useState<Exercise>("squat");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [runState, setRunState] = useState<RunState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<{
    reps: number;
    primary: number | null;
    secondary: number | null;
    visibility: number;
  }>({ reps: 0, primary: null, secondary: null, visibility: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null);
  const metricsRef = useRef<FrameMetrics[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(-1);
  const counterRef = useRef<ReturnType<typeof createRepCounter> | null>(null);

  const exerciseLabel = useMemo(
    () => EXERCISES.find((e) => e.id === exercise)?.label ?? exercise,
    [exercise]
  );

  const liveLabels = useMemo(() => {
    if (exercise === "squat") return { primary: "Knee", secondary: "Tilt" };
    if (exercise === "deadlift") return { primary: "Hip", secondary: "Tilt" };
    return { primary: "Elbow", secondary: "Elbow" };
  }, [exercise]);

  const ensureModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setLoadState("loading-model");
    setErrorMessage(null);
    try {
      const { FilesetResolver, PoseLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker as unknown as PoseLandmarkerInstance;
      setLoadState("ready");
      return landmarkerRef.current;
    } catch (err) {
      console.error("Failed to load pose model", err);
      setLoadState("error");
      setErrorMessage(
        "Couldn't load the pose detection model. Check your internet connection and try again."
      );
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      landmarkerRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        setErrorMessage("Please upload a video file.");
        return;
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoFileName(file.name);
      setVideoAspect(16 / 9);
      setResult(null);
      setRunState("idle");
      setErrorMessage(null);
      setLiveMetrics({ reps: 0, primary: null, secondary: null, visibility: 0 });
    },
    [videoUrl]
  );

  const handleVideoMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    setVideoAspect(v.videoWidth / v.videoHeight);
  }, []);

  const drawOverlay = useCallback(
    (landmarks: Landmark[] | null, video: HTMLVideoElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (!landmarks) return;

      ctx.strokeStyle = "rgba(41,151,255,0.95)";
      ctx.lineWidth = Math.max(2, w / 400);
      for (const [a, b] of POSE_CONNECTIONS) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(191,90,242,0.95)";
      const r = Math.max(3, w / 220);
      for (const p of landmarks) {
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    []
  );

  const startAnalysis = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      setErrorMessage("Upload a video first.");
      return;
    }
    const landmarker = await ensureModel();
    if (!landmarker) return;

    setRunState("analyzing");
    setResult(null);
    setErrorMessage(null);
    metricsRef.current = [];
    counterRef.current = createRepCounter(exercise);
    lastTimestampRef.current = -1;
    video.currentTime = 0;
    video.muted = true;

    const loop = () => {
      if (!videoRef.current) return;
      const v = videoRef.current;
      if (v.paused || v.ended) return;
      const ts = v.currentTime * 1000;
      if (ts <= lastTimestampRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTimestampRef.current = ts;
      try {
        const res = landmarker.detectForVideo(v, ts);
        const lm = res.landmarks?.[0] ?? null;
        drawOverlay(lm, v);
        const m = lm
          ? computeFrameMetrics(lm, ts, exercise)
          : {
              timestamp: ts,
              kneeAngle: null,
              hipAngle: null,
              backAngleDeg: null,
              elbowAngle: null,
              visibility: 0,
            };
        metricsRef.current.push(m);
        const reps = counterRef.current?.update(m) ?? 0;
        const primary =
          exercise === "squat"
            ? m.kneeAngle
            : exercise === "deadlift"
            ? m.hipAngle
            : m.elbowAngle;
        const secondary =
          exercise === "squat" || exercise === "deadlift"
            ? m.backAngleDeg
            : m.elbowAngle;
        setLiveMetrics({
          reps,
          primary,
          secondary,
          visibility: m.visibility,
        });
      } catch (err) {
        console.error("detect failed", err);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    const onEnded = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const summary = summarize(exercise, metricsRef.current);
      setResult(summary);
      setRunState("done");
      video.removeEventListener("ended", onEnded);
    };
    video.addEventListener("ended", onEnded, { once: true });

    try {
      await video.play();
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("play failed", err);
      setErrorMessage("Couldn't start video playback. Try again.");
      setRunState("idle");
    }
  }, [drawOverlay, ensureModel, exercise, videoUrl]);

  const resetAnalysis = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setResult(null);
    setRunState("idle");
    setLiveMetrics({ reps: 0, primary: null, secondary: null, visibility: 0 });
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const visibilityPct = Math.round((liveMetrics.visibility ?? 0) * 100);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm text-white/60">
          <ScanLine className="size-4 text-apple-blue" />
          AI Form Check
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Get instant <span className="gradient-text">feedback</span> on your form
        </h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Upload a side-view clip and our on-device pose engine tracks every joint
          to coach you in real time. Nothing leaves your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <GlassCard className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Video className="size-4 shrink-0 text-apple-blue" />
              <p className="truncate text-sm font-medium text-white/80">
                {videoFileName ?? "No video uploaded"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFile}
                  className="hidden"
                />
                <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/90 transition-all hover:bg-white/10 hover:scale-[1.03]">
                  <Upload className="size-4" />
                  {videoUrl ? "Replace video" : "Upload video"}
                </span>
              </label>
              {videoUrl && runState !== "analyzing" && (
                <Button
                  variant="primary"
                  size="default"
                  onClick={startAnalysis}
                  disabled={loadState === "loading-model"}
                >
                  {loadState === "loading-model" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Loading model
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      Analyze
                    </>
                  )}
                </Button>
              )}
              {runState === "analyzing" && (
                <Button variant="ghost" onClick={resetAnalysis}>
                  Cancel
                </Button>
              )}
              {runState === "done" && (
                <Button variant="ghost" onClick={resetAnalysis}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div
            className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/60"
            style={{
              aspectRatio: videoAspect,
              width: "100%",
              maxWidth: "100%",
              maxHeight: "70vh",
            }}
          >
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  muted
                  onLoadedMetadata={handleVideoMetadata}
                  controls={runState !== "analyzing"}
                  className="block size-full"
                />
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 size-full"
                />
                {runState === "analyzing" && (
                  <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs text-white/85 backdrop-blur">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-apple-blue/70" />
                      <span className="relative inline-flex size-2 rounded-full bg-apple-blue" />
                    </span>
                    Analyzing live · pose {visibilityPct}%
                  </div>
                )}
              </>
            ) : (
              <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 text-white/60 transition hover:bg-white/[0.03]">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFile}
                  className="hidden"
                />
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5">
                  <Upload className="size-6 text-white/70" />
                </div>
                <p className="text-sm">
                  Drop a video here or{" "}
                  <span className="text-apple-blue">click to upload</span>
                </p>
                <p className="text-xs text-white/40">
                  Side view, full body in frame, MP4 or MOV
                </p>
              </label>
            )}
          </div>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {runState === "analyzing" && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricChip
                label="Reps"
                value={liveMetrics.reps.toString()}
                accent="purple"
              />
              <MetricChip
                label={liveLabels.primary}
                value={
                  liveMetrics.primary !== null
                    ? `${liveMetrics.primary.toFixed(0)}°`
                    : "—"
                }
                accent="blue"
              />
              <MetricChip
                label={liveLabels.secondary}
                value={
                  liveMetrics.secondary !== null
                    ? `${liveMetrics.secondary.toFixed(0)}°`
                    : "—"
                }
                accent="teal"
              />
            </div>
          )}
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="p-5">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Exercise
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {exerciseLabel}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {EXERCISES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setExercise(ex.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all hover:scale-[1.02]",
                    exercise === ex.id
                      ? "border-apple-blue/50 bg-apple-blue/10 text-white shadow-[0_0_24px_rgba(41,151,255,0.18)]"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  )}
                >
                  <span className="text-base" aria-hidden>
                    {ex.emoji}
                  </span>
                  {ex.label}
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-white/50">
              <Activity className="mt-0.5 size-3 shrink-0 text-apple-blue" />
              Squat & Deadlift work best from a side view. Bench, OHP & Pull-up
              prefer a front-side angle.
            </p>
          </GlassCard>

          <GlassCard className="p-5" glow="purple">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Coach feedback
            </p>
            {runState === "idle" && !result && (
              <div className="mt-3 space-y-2 text-sm text-white/60">
                <p>Pick an exercise, upload a clip, then hit Analyze.</p>
                <ul className="ml-4 list-disc space-y-1 text-xs text-white/40">
                  <li>Side view, full body visible</li>
                  <li>Steady camera, good lighting</li>
                  <li>One person in frame</li>
                </ul>
              </div>
            )}
            {runState === "analyzing" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="size-4 animate-spin text-apple-blue" />
                Tracking your form…
              </div>
            )}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 space-y-3"
              >
                <div className="grid grid-cols-3 gap-2 text-center">
                  <SummaryCell label="Reps" value={result.reps.toString()} />
                  <SummaryCell
                    label={result.summary.primaryLabel}
                    value={result.summary.primaryValue}
                  />
                  <SummaryCell
                    label={result.summary.secondaryLabel}
                    value={result.summary.secondaryValue}
                  />
                </div>
                <p className="text-[11px] text-white/40">
                  {result.framesWithPose} / {result.totalFrames} frames had a
                  clean read on your body.
                </p>
                <ul className="space-y-2">
                  {result.tips.map((t) => (
                    <li
                      key={t.id}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border p-3 text-sm",
                        t.severity === "ok" &&
                          "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
                        t.severity === "warn" &&
                          "border-amber-400/30 bg-amber-400/10 text-amber-100",
                        t.severity === "bad" &&
                          "border-red-500/30 bg-red-500/10 text-red-100"
                      )}
                    >
                      {t.severity === "ok" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      )}
                      <span>{t.message}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "blue" | "purple" | "teal";
}) {
  const ring =
    accent === "blue"
      ? "shadow-[0_0_24px_rgba(41,151,255,0.25)]"
      : accent === "purple"
      ? "shadow-[0_0_24px_rgba(191,90,242,0.25)]"
      : "shadow-[0_0_24px_rgba(45,212,191,0.25)]";
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center",
        ring
      )}
    >
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
