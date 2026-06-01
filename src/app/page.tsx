import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Dumbbell,
  Sparkles,
} from "lucide-react";

import { BackgroundVideo } from "@/components/datacore/background-video";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "AI Coach", href: "/coach" },
  { label: "Form Check", href: "/coach/form-check" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "#blog" },
];

const TRUSTED_BY = [
  "iron academy",
  "barbell club",
  "the box",
  "press pit",
  "strong lab",
  "powerhouse",
  "garage gym",
  "iron temple",
];

export default function HomePage() {
  return (
    <div className="font-inter relative isolate min-h-screen overflow-hidden text-white antialiased">
      <BackgroundVideo src="https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8" />

      {/* Top nav */}
      <header className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="font-manrope flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#7b39fc] to-[#9759ff] shadow-[0_0_20px_rgba(123,57,252,0.55)]">
            <Dumbbell className="size-4 text-white" />
          </span>
          GYMERS
        </Link>

        <nav className="font-inter hidden items-center gap-1 rounded-full glass-pill px-1.5 py-1.5 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-white/70 transition-colors hover:bg-white/8 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="font-inter hidden rounded-full px-3 py-2 text-sm text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="font-inter group inline-flex items-center gap-1.5 rounded-full bg-[#7b39fc] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(123,57,252,0.7)] ring-1 ring-white/15 transition-all hover:bg-[#8c4cff] hover:shadow-[0_12px_32px_-6px_rgba(123,57,252,0.85)]"
          >
            Start free
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        id="hero"
        className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-16 pb-24 text-center sm:px-8 sm:pt-24 lg:pt-32"
      >
        {/* Glassmorphism pill badge */}
        <Link
          href="/coach/form-check"
          className="font-cabin group mb-8 inline-flex items-center gap-2 rounded-full glass-pill py-1.5 pl-1.5 pr-4 text-sm text-white/90 transition-all hover:bg-white/8"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f87b52] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_4px_14px_-2px_rgba(248,123,82,0.55)]">
            <Sparkles className="size-3" />
            New
          </span>
          <span>Introducing AI Form Check</span>
          <ChevronRight className="size-3.5 text-white/50 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Headline */}
        <h1 className="font-manrope text-balance text-[clamp(2.75rem,6.2vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          <span className="text-gradient-datacore">Your Workouts.</span>
          <br />
          <span className="text-white">
            One{" "}
            <span className="font-instrument-serif italic font-normal text-[#f87b52]">
              Intelligent
            </span>{" "}
            Coach.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="font-inter mt-6 max-w-xl text-balance text-base text-white/60 sm:text-lg">
          The AI workout platform that tracks every rep, grades your form on
          camera, and pushes you toward your next PR — built for the way you
          actually train.
        </p>

        {/* CTAs */}
        <div
          id="cta"
          className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        >
          <Link
            href="/signup"
            className="font-inter group relative inline-flex items-center justify-center gap-2 rounded-full bg-[#7b39fc] px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-8px_rgba(123,57,252,0.8)] ring-1 ring-white/15 transition-all hover:bg-[#8c4cff] hover:shadow-[0_14px_36px_-8px_rgba(123,57,252,0.95)] hover:-translate-y-0.5"
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-white/15 to-transparent opacity-60"
            />
            Start training free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/dashboard"
            className="font-inter group inline-flex items-center justify-center gap-2 rounded-full bg-[#0a0e1e] px-7 py-3.5 text-[15px] font-medium text-white ring-1 ring-white/15 transition-all hover:bg-[#11162a] hover:ring-white/25 hover:-translate-y-0.5"
          >
            Open dashboard
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Micro-trust line */}
        <p className="font-inter mt-6 flex items-center gap-2 text-xs text-white/40">
          <span className="inline-flex size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          Free forever plan · No card required · Built by lifters, for lifters
        </p>
      </section>

      {/* Trusted by — infinite ticker */}
      <section className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-12 sm:px-8">
        <div className="mb-5 flex items-center justify-center">
          <p className="font-cabin text-[11px] uppercase tracking-[0.32em] text-white/35">
            Loved by lifters training at
          </p>
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-scroll-x gap-14 whitespace-nowrap pr-14">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="font-manrope text-2xl font-semibold tracking-tight text-white/40 transition-colors hover:text-white/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Decorative bottom glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[420px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(123,57,252,0.35), transparent 60%)",
        }}
      />
    </div>
  );
}
