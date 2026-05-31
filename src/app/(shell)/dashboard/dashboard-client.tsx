"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  Brain,
  CalendarDays,
  Dumbbell,
  Plus,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AnimatedBg } from "@/components/ui/animated-bg";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  WeeklyVolumeChart,
  type WeeklyPoint,
} from "@/components/charts/weekly-volume-chart";

type DashboardClientProps = {
  firstName: string;
  stats: {
    workouts: number;
    streak: number;
    trophies: number;
    thisWeek: number;
  };
  recent: Array<{
    id: string;
    title: string;
    performedAt: string;
  }>;
  weekly: WeeklyPoint[];
};

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) return;
    const steps = Math.min(target, 30);
    const stepMs = Math.max(20, durationMs / steps);
    const increment = Math.max(1, Math.ceil(target / steps));
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(current);
      }
    }, stepMs);
    return () => clearInterval(timer);
  }, [target, durationMs]);

  return value;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function DashboardClient({
  firstName,
  stats,
  recent,
  weekly,
}: DashboardClientProps) {
  const streak = useCountUp(stats.streak);

  const cards = [
    { label: "Workouts", value: stats.workouts, icon: Dumbbell, glow: "blue" as const },
    { label: "Streak (days)", value: stats.streak, icon: Zap, glow: "purple" as const },
    { label: "Trophies", value: stats.trophies, icon: Trophy, glow: "teal" as const },
    {
      label: "This week",
      value: stats.thisWeek,
      icon: CalendarDays,
      glow: "blue" as const,
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AnimatedBg />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-6"
      >
        <p className="text-sm text-white/60">Dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Welcome back, <span className="gradient-text">{firstName}</span>
        </h1>
        <p className="mt-3 text-white/60">
          {stats.streak > 0
            ? `You are on a ${streak}-day consistency streak. Keep it going.`
            : "Log your first workout to start a streak."}
        </p>
      </motion.section>

      <section className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
          >
            <GlassCard hover glow={stat.glow} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <stat.icon className="size-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-white/60">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold text-white">{stat.value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative z-10 mt-8"
      >
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Weekly volume</p>
              <p className="text-lg font-semibold text-white">Workouts per week</p>
            </div>
            <Link
              href="/coach"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              <Brain className="size-3 text-apple-purple" />
              Get AI Plan
            </Link>
          </div>
          <WeeklyVolumeChart data={weekly} />
        </GlassCard>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 mt-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Recent workouts</h2>
          <Link
            href="/records"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            <Award className="size-3 text-apple-blue" />
            View PRs
          </Link>
        </div>
        {recent.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-white/70">No workouts yet.</p>
            <Button
              variant="primary"
              className="mt-4"
              render={<Link href="/workouts" />}
            >
              <Plus data-icon="inline-start" />
              Log first workout
            </Button>
          </GlassCard>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recent.map((workout) => (
              <GlassCard
                key={workout.id}
                hover
                className="min-w-[220px] p-4"
                glow="purple"
              >
                <p className="text-sm text-white/60">{formatDate(workout.performedAt)}</p>
                <p className="mt-1 text-lg font-medium text-white">{workout.title}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="fixed bottom-6 right-6 z-20 flex flex-col gap-3"
      >
        <Button variant="primary" size="lg" render={<Link href="/workouts" />}>
          <Plus data-icon="inline-start" />
          New Workout
        </Button>
        <Button variant="ghost" size="lg" render={<Link href="/coach" />}>
          <Brain data-icon="inline-start" />
          AI Coach
        </Button>
      </motion.div>
    </div>
  );
}
