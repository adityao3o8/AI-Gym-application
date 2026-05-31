import type { Metadata } from "next";
import { Mail, ShieldCheck, User as UserIcon } from "lucide-react";

import { setAccountabilityPartner } from "@/app/actions/features";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { INJURY_OPTIONS, parseInjuryFlags } from "@/lib/injury-coach";
import { credTier } from "@/lib/gym-cred";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

type ProfilePageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select(
      "full_name, avatar_url, role, streak_count, last_workout_at, email, injury_flags, gym_cred, rest_tokens, accountability_partner_id"
    )
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const injuries = parseInjuryFlags(profile?.injury_flags);
  const tier = credTier(profile?.gym_cred ?? 0);

  let partnerName: string | null = null;
  if (profile?.accountability_partner_id) {
    const { data: partner } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", profile.accountability_partner_id)
      .maybeSingle();
    partnerName = partner?.full_name ?? partner?.email ?? null;
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm text-white/60">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your <span className="gradient-text">account</span>
        </h1>
      </header>

      {params.message && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {params.error}
        </p>
      )}

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
                {profile?.role ?? "member"} · {tier.label}
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
              Streak: {profile?.streak_count ?? 0}d · Rest tokens:{" "}
              {profile?.rest_tokens ?? 0}
            </li>
            <li>Gym Cred: {profile?.gym_cred ?? 0}</li>
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
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="avatar_url" className="text-sm font-medium text-white/80">
                Avatar URL
              </label>
              <input
                id="avatar_url"
                name="avatar_url"
                type="url"
                defaultValue={profile?.avatar_url ?? ""}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-white/80">
                Injury-aware training
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {INJURY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                  >
                    <input
                      type="checkbox"
                      name="injury_flags"
                      value={opt.id}
                      defaultChecked={injuries.includes(opt.id)}
                      className="rounded"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button variant="primary" type="submit" className="h-11 w-full rounded-xl">
              Save changes
            </Button>
          </form>
        </GlassCard>
      </section>

      <GlassCard className="mt-4 p-5">
        <p className="text-lg font-semibold text-white">Silent accountability partner</p>
        <p className="mt-1 text-sm text-white/60">
          {partnerName
            ? `Linked with ${partnerName} — you see each other's streak dots on the dashboard.`
            : "Match with someone for streak visibility only (no DMs)."}
        </p>
        <form action={setAccountabilityPartner} className="mt-3 flex gap-2">
          <input
            name="partner_email"
            type="email"
            placeholder="Partner's email"
            className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
          />
          <Button type="submit" variant="ghost" size="sm">
            Link
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
