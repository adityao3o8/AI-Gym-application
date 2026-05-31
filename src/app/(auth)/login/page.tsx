import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { AnimatedBg } from "@/components/ui/animated-bg";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Log in",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  async function login(formData: FormData) {
    "use server";

    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
      redirect("/login?error=Enter+an+email+and+password");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/dashboard");
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden lg:grid-cols-2">
      <AnimatedBg />

      <section className="relative hidden border-r border-white/10 lg:flex">
        <div className="relative z-10 flex h-full w-full flex-col justify-center px-16">
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">GYMERS</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-white">
            Make every session
            <span className="gradient-text"> count</span>
          </h1>
          <p className="mt-4 max-w-md text-white/60">
            Track workouts, maintain streaks, and unlock rewards with a focused interface.
          </p>
          <div className="mt-8 space-y-3">
            {["Fast workout logging", "Live streak tracking", "Owner insights dashboard"].map(
              (item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
                >
                  <CheckCircle2 className="size-4 text-apple-blue" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 flex items-center justify-center px-4 py-20 sm:px-8">
        <GlassCard className="w-full max-w-md p-7 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-white/60">Sign in to continue your progress.</p>
          <form action={login} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/80">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-white/80">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>
            {params.message ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {params.message}
              </p>
            ) : null}
            {params.error ? (
              <p className="animate-pulse rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {params.error}
              </p>
            ) : null}
            <Button className="h-11 w-full rounded-xl" variant="primary" type="submit">
              Log in
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-white/60">
            No account?{" "}
            <Link href="/signup" className="font-medium text-white hover:text-apple-blue">
              Sign up
            </Link>
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
