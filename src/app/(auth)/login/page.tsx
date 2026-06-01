import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, MailCheck } from "lucide-react";

import { resendConfirmation } from "@/app/actions/auth";
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
    email?: string;
  }>;
};

// Supabase returns these messages when the email isn't confirmed yet.
// "Invalid login credentials" is deliberately vague to avoid leaking
// which emails exist — but in our flow it almost always means
// "confirmed email is missing".
function looksLikeUnconfirmed(err: string | undefined) {
  if (!err) return false;
  const v = err.toLowerCase();
  return (
    v.includes("invalid login credentials") ||
    v.includes("email not confirmed") ||
    v.includes("not confirmed")
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const presetEmail = params.email ?? "";
  const unconfirmed = looksLikeUnconfirmed(params.error);

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
      // Preserve the email in the URL so we can default it back into
      // the input and pre-fill the resend-confirmation form.
      redirect(
        `/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email.trim())}`
      );
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
                defaultValue={presetEmail}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-apple-blue/50 focus-visible:ring-2 focus-visible:ring-apple-blue/50"
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
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-apple-blue/50 focus-visible:ring-2 focus-visible:ring-apple-blue/50"
              />
            </div>

            {params.message ? (
              <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>{params.message}</span>
              </p>
            ) : null}

            {params.error && !unconfirmed ? (
              <p className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{params.error}</span>
              </p>
            ) : null}

            <Button className="h-11 w-full rounded-xl" variant="primary" type="submit">
              Log in
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>

          {unconfirmed ? (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="flex items-start gap-2">
                <MailCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-100">
                    Your email isn&apos;t confirmed yet.
                  </p>
                  <p className="text-xs text-amber-100/80">
                    Supabase sent a confirmation link when you signed up.
                    Click that link from your inbox, or resend it below.
                  </p>
                </div>
              </div>
              <form action={resendConfirmation} className="mt-3">
                <input type="hidden" name="email" value={presetEmail} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="w-full rounded-lg"
                  disabled={!presetEmail}
                >
                  {presetEmail
                    ? `Resend confirmation to ${presetEmail}`
                    : "Enter your email above first"}
                </Button>
              </form>
            </div>
          ) : null}

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
