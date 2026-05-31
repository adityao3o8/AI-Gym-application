import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";

import { AnimatedBg } from "@/components/ui/animated-bg";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign up",
};

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  async function signup(formData: FormData) {
    "use server";

    const email = formData.get("email");
    const password = formData.get("password");
    const fullName = formData.get("full_name");
    const role = formData.get("role");

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof fullName !== "string" ||
      (role !== "member" && role !== "owner")
    ) {
      redirect("/signup?error=Please+fill+all+fields");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
        },
      },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/login?message=Check+your+email+to+confirm+your+account");
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden lg:grid-cols-2">
      <AnimatedBg />

      <section className="relative hidden border-r border-white/10 lg:flex">
        <div className="relative z-10 flex h-full w-full flex-col justify-center px-16">
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">GYMERS</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-white">
            Start your
            <span className="gradient-text"> transformation</span>
          </h1>
          <p className="mt-4 max-w-md text-white/60">
            Create your account and keep your fitness routine consistent with guided
            progress and gym-ready analytics.
          </p>
          <div className="mt-8 space-y-3">
            {["Secure Supabase auth", "Role-aware experience", "Clean and focused UI"].map(
              (item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
                >
                  <ShieldCheck className="size-4 text-apple-purple" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 flex items-center justify-center px-4 py-20 sm:px-8">
        <GlassCard className="w-full max-w-md p-7 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Create account</h2>
          <p className="mt-2 text-sm text-white/60">Join as member or owner.</p>
          <form action={signup} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium text-white/80">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>
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
                minLength={6}
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium text-white/80">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="member"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              >
                <option value="member" className="bg-[#12131b]">
                  Member
                </option>
                <option value="owner" className="bg-[#12131b]">
                  Owner
                </option>
              </select>
            </div>
            {params.error ? (
              <p className="animate-pulse rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {params.error}
              </p>
            ) : null}
            <Button className="h-11 w-full rounded-xl" variant="primary" type="submit">
              Sign up
              <Sparkles data-icon="inline-end" />
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-white hover:text-apple-blue">
              Log in
            </Link>
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
