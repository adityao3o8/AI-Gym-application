import type { Metadata } from "next";
import Link from "next/link";
import { Award, MessageCircle, Users } from "lucide-react";

import { submitHallOfFame, createFeedPost, joinChallenge } from "@/app/actions/features";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Community" };

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function CommunityPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id, full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const gymId = profile?.gym_id;

  const [postsRes, challengesRes, hallRes, gymRes] = gymId
    ? await Promise.all([
        supabase
          .from("gym_feed_posts")
          .select("id, body, post_type, created_at, user_id")
          .eq("gym_id", gymId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("gym_challenges")
          .select("id, title, target_value, ends_at, challenge_participants(progress, user_id)")
          .eq("gym_id", gymId)
          .gte("ends_at", new Date().toISOString())
          .order("ends_at"),
        supabase
          .from("gym_hall_of_fame")
          .select("id, exercise_name, weight_kg, reps, achieved_at, user_id")
          .eq("gym_id", gymId)
          .order("weight_kg", { ascending: false })
          .limit(12),
        supabase.from("gyms").select("name").eq("id", gymId).single(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: null }];

  const posts = postsRes.data ?? [];
  const challenges = challengesRes.data ?? [];
  const hall = hallRes.data ?? [];
  const gymName = gymRes.data?.name ?? "Your gym";

  if (!gymId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <GlassCard className="p-8 text-center">
          <Users className="mx-auto mb-3 size-10 text-apple-blue" />
          <h1 className="text-2xl font-semibold text-white">Join your gym first</h1>
          <p className="mt-2 text-white/60">
            Check in with your gym&apos;s code to unlock the feed, challenges, and Hall of Fame.
          </p>
          <Button variant="primary" className="mt-4" render={<Link href="/check-in" />}>
            Go to Check-in
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm text-white/60">{gymName} · Community</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Gym <span className="gradient-text">feed</span> & challenges
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

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-5">
          <p className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <MessageCircle className="size-5 text-apple-blue" /> Feed
          </p>
          <form action={createFeedPost} className="mb-4 flex gap-2">
            <input
              name="body"
              placeholder="Share a PR, streak, or tip…"
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            />
            <Button type="submit" variant="primary" size="sm">
              Post
            </Button>
          </form>
          <ul className="space-y-3">
            {posts.length === 0 ? (
              <li className="text-sm text-white/50">No posts yet — start the conversation.</li>
            ) : (
              posts.map((p) => (
                  <li key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="text-xs text-white/40">
                      Member ·{" "}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-white/90">{p.body}</p>
                  </li>
                ))
            )}
          </ul>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="p-5">
            <p className="mb-3 text-lg font-semibold text-white">Active challenges</p>
            {challenges.length === 0 ? (
              <p className="text-sm text-white/50">No active challenges. Owners can create one.</p>
            ) : (
              <ul className="space-y-3">
                {challenges.map((c) => (
                  <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="font-medium text-white">{c.title}</p>
                    <p className="text-xs text-white/50">
                      Goal: {c.target_value} workouts · ends{" "}
                      {new Date(c.ends_at).toLocaleDateString()}
                    </p>
                    <form action={joinChallenge} className="mt-2">
                      <input type="hidden" name="challenge_id" value={c.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Join
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="p-5" glow="purple">
            <p className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Award className="size-5 text-apple-purple" /> Hall of Fame
            </p>
            {hall.length === 0 ? (
              <p className="text-sm text-white/50">No gym records yet.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {hall.map((h) => (
                    <li
                      key={h.id}
                      className="flex justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="text-white">{h.exercise_name}</span>
                      <span className="font-semibold text-apple-blue">{h.weight_kg}kg</span>
                    </li>
                  ))}
              </ul>
            )}
            <form action={submitHallOfFame} className="grid gap-2 sm:grid-cols-3">
              <input
                name="exercise_name"
                placeholder="Exercise"
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
              />
              <input
                name="weight_kg"
                type="number"
                step="0.5"
                placeholder="Weight kg"
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
              />
              <Button type="submit" variant="primary" size="sm">
                Submit PR
              </Button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
