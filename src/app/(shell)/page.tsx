import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Award,
  Brain,
  Dumbbell,
  LineChart,
  Trophy,
  Zap,
} from "lucide-react";

import { AnimatedBg } from "@/components/ui/animated-bg";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const features = [
  {
    icon: Brain,
    title: "AI Coach",
    description:
      "Smart, history-aware workout suggestions with progressive overload.",
  },
  {
    icon: Dumbbell,
    title: "Workout logging",
    description: "Track exercises, sets, reps and weights with a fast UI.",
  },
  {
    icon: Award,
    title: "Personal Records",
    description: "Auto-detected PRs from every weighted lift you log.",
  },
  {
    icon: Zap,
    title: "Streaks & Trophies",
    description: "Get rewarded for consistency with auto-awarded badges.",
  },
  {
    icon: LineChart,
    title: "Visual analytics",
    description: "Beautiful charts of weekly volume to understand your pace.",
  },
  {
    icon: Activity,
    title: "Owner insights",
    description: "Role-gated analytics dashboard for gym owners.",
  },
];

export default function HomePage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <AnimatedBg />

      <section className="relative z-10 mx-auto max-w-4xl py-12 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/70">
          <Brain className="size-3 text-apple-purple" />
          AI-powered fitness OS
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Train smarter.
          <br />
          <span className="gradient-text">Train consistently.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-white/60">
          GYMERS is your AI workout coach, personal records tracker, and gym
          analytics platform — all in one stunning, modern interface.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="primary" size="lg" render={<Link href="/signup" />}>
            Get started
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="lg" variant="ghost" render={<Link href="/dashboard" />}>
            View dashboard
          </Button>
        </div>
      </section>

      <section className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <GlassCard key={title} hover glow="blue" className="p-5">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-apple-blue/30 to-apple-purple/30">
              <Icon className="size-5 text-white" />
            </div>
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-white/60">{description}</p>
          </GlassCard>
        ))}
      </section>

      <section className="relative z-10 mt-16">
        <GlassCard className="p-8 sm:p-10">
          <div className="grid items-center gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/40">
                For gym owners
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Real-time insight into your <span className="gradient-text">community</span>
              </h2>
              <p className="mt-3 text-white/60">
                Active members, weekly volume, attendance check-ins, and top
                streaks — all in one role-gated dashboard.
              </p>
              <div className="mt-5">
                <Button variant="primary" render={<Link href="/owner" />}>
                  Open owner view
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-widest text-white/50">
                  Members
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">128</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-widest text-white/50">
                  Check-ins / 7d
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">312</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-widest text-white/50">
                  Top streak
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">42d</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-widest text-white/50">
                  Trophies given
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-2xl font-semibold text-white">
                  <Trophy className="size-5 text-apple-blue" />
                  87
                </p>
              </GlassCard>
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
