import type { Metadata } from "next";
import { Mail, ShieldCheck, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { updateProfile } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profile",
};

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url, role, streak_count, last_workout_at, email")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm text-white/60">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your <span className="gradient-text">account</span>
        </h1>
        <p className="mt-2 text-white/60">Update your basic info anytime.</p>
      </header>

      {params.message ? (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {params.message}
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {params.error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-apple-blue/30 to-apple-purple/30">
              <UserIcon className="size-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {profile?.full_name ?? "Add your name"}
              </p>
              <p className="text-xs uppercase tracking-widest text-white/40">
                {profile?.role ?? "member"}
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-white/50" />
              {profile?.email ?? user?.email}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-white/50" />
              Streak: {profile?.streak_count ?? 0} days
            </li>
          </ul>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium text-white/80">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={profile?.full_name ?? ""}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="avatar_url" className="text-sm font-medium text-white/80">
                Avatar URL (optional)
              </label>
              <input
                id="avatar_url"
                name="avatar_url"
                type="url"
                placeholder="https://..."
                defaultValue={profile?.avatar_url ?? ""}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
              />
            </div>
            <Button variant="primary" type="submit" className="h-11 w-full rounded-xl">
              Save changes
            </Button>
          </form>
        </GlassCard>
      </section>
    </div>
  );
}
