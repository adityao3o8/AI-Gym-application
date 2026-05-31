"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { computeGymCred } from "@/lib/gym-cred";
import {
  computeStreakWithRestToken,
} from "@/lib/gamification";
import { divisionFromXp, XP_REWARDS } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

async function awardXpAndCred(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  xpGain: number
) {
  const { data: profile } = await supabase
    .from("users")
    .select("season_xp, gym_cred, streak_count")
    .eq("id", userId)
    .single();

  const newXp = (profile?.season_xp ?? 0) + xpGain;
  await supabase
    .from("users")
    .update({
      season_xp: newXp,
      division: divisionFromXp(newXp),
    })
    .eq("id", userId);
}

async function refreshGymCred(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [profile, workouts, trophies, checkIns, formScores] = await Promise.all([
    supabase
      .from("users")
      .select("streak_count, season_xp")
      .eq("id", userId)
      .single(),
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_trophies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("workouts")
      .select("form_score")
      .eq("user_id", userId)
      .not("form_score", "is", null),
  ]);

  const scores = (formScores.data ?? [])
    .map((w) => w.form_score)
    .filter((s): s is number => s !== null);
  const avgForm =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

  const cred = computeGymCred({
    streak: profile.data?.streak_count ?? 0,
    workoutCount: workouts.count ?? 0,
    trophyCount: trophies.count ?? 0,
    avgFormScore: avgForm,
    checkInCount: checkIns.count ?? 0,
    seasonXp: profile.data?.season_xp ?? 0,
  });

  await supabase.from("users").update({ gym_cred: cred }).eq("id", userId);
  return cred;
}

export async function checkInGym(formData: FormData) {
  const code = formData.get("check_in_code");
  if (typeof code !== "string" || !code.trim()) {
    redirect("/check-in?error=Enter+a+check-in+code");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("check_in_code", code.trim().toUpperCase())
    .maybeSingle();

  if (!gym) {
    redirect("/check-in?error=Invalid+check-in+code");
  }

  await supabase
    .from("users")
    .update({ gym_id: gym.id })
    .eq("id", user.id);

  const { error } = await supabase.from("attendance").insert({
    user_id: user.id,
    gym_id: gym.id,
    checked_in_at: new Date().toISOString(),
  });

  if (error) redirect(`/check-in?error=${encodeURIComponent(error.message)}`);

  await awardXpAndCred(supabase, user.id, XP_REWARDS.checkIn);
  await refreshGymCred(supabase, user.id);

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  revalidatePath("/community");
  redirect("/check-in?message=Checked+in+successfully");
}

export async function createFeedPost(formData: FormData) {
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) {
    redirect("/community?error=Post+cannot+be+empty");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (!profile?.gym_id) {
    redirect("/community?error=Join+a+gym+via+check-in+first");
  }

  await supabase.from("gym_feed_posts").insert({
    gym_id: profile.gym_id,
    user_id: user.id,
    body: body.trim(),
    post_type: "update",
  });

  revalidatePath("/community");
  redirect("/community?message=Posted");
}

export async function joinChallenge(formData: FormData) {
  const challengeId = formData.get("challenge_id");
  if (typeof challengeId !== "string") redirect("/community?error=Invalid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("challenge_participants").upsert({
    challenge_id: challengeId,
    user_id: user.id,
    progress: 0,
  });

  revalidatePath("/community");
  redirect("/community?message=Joined+challenge");
}

export async function createChallenge(formData: FormData) {
  const title = formData.get("title");
  const target = formData.get("target_value");
  const days = formData.get("days");

  if (typeof title !== "string" || !title.trim()) {
    redirect("/owner?error=Challenge+title+required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.gym_id || (profile.role !== "owner" && profile.role !== "admin")) {
    redirect("/owner?error=Owners+only");
  }

  const durationDays = Number(days) || 14;
  const ends = new Date();
  ends.setDate(ends.getDate() + durationDays);

  await supabase.from("gym_challenges").insert({
    gym_id: profile.gym_id,
    created_by: user.id,
    title: title.trim(),
    description: "Gym challenge",
    challenge_type: "workout_count",
    target_value: Number(target) || 5,
    ends_at: ends.toISOString(),
  });

  revalidatePath("/community");
  revalidatePath("/owner");
  redirect("/owner?message=Challenge+created");
}

export async function claimEquipment(formData: FormData) {
  const equipmentId = formData.get("equipment_id");
  if (typeof equipmentId !== "string") redirect("/equipment?error=Invalid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("equipment_usage").insert({
    equipment_id: equipmentId,
    user_id: user.id,
  });

  revalidatePath("/equipment");
  redirect("/equipment?message=Equipment+claimed");
}

export async function releaseEquipment(formData: FormData) {
  const usageId = formData.get("usage_id");
  if (typeof usageId !== "string") redirect("/equipment?error=Invalid");

  const supabase = await createClient();
  await supabase
    .from("equipment_usage")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", usageId);

  revalidatePath("/equipment");
  redirect("/equipment?message=Equipment+released");
}

export async function logFormCheckWorkout(formData: FormData) {
  const exercise = formData.get("exercise");
  const reps = formData.get("reps");
  const formScore = formData.get("form_score");
  const weight = formData.get("weight_kg");

  if (typeof exercise !== "string") {
    redirect("/coach/form-check?error=Missing+exercise");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id, streak_count, last_workout_at, rest_tokens, season_xp")
    .eq("id", user.id)
    .single();

  const now = new Date();
  const streakResult = computeStreakWithRestToken(
    profile?.streak_count ?? 0,
    profile?.last_workout_at ? new Date(profile.last_workout_at) : null,
    now,
    profile?.rest_tokens ?? 0
  );

  const repCount = Number(reps) || 0;
  const score = Number(formScore) || null;

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      gym_id: profile?.gym_id ?? null,
      title: `${exercise} (Form Check)`,
      notes: "Auto-logged from AI Form Check",
      performed_at: now.toISOString(),
      form_score: score,
      reps_detected: repCount,
      exercise_detected: exercise,
      source: "form_check",
    })
    .select("id")
    .single();

  if (error || !workout) {
    redirect(`/coach/form-check?error=${encodeURIComponent(error?.message ?? "Failed")}`);
  }

  if (repCount > 0) {
    await supabase.from("workout_entries").insert({
      workout_id: workout.id,
      exercise_name: exercise,
      sets: 1,
      reps: repCount,
      weight_kg:
        typeof weight === "string" && weight.trim()
          ? Number(weight)
          : null,
      sort_order: 0,
    });
  }

  const userUpdate: {
    streak_count: number;
    last_workout_at: string;
    season_xp: number;
    division: string;
    rest_tokens?: number;
  } = {
    streak_count: streakResult.newStreak,
    last_workout_at: now.toISOString(),
    season_xp: (profile?.season_xp ?? 0) + XP_REWARDS.formCheck,
    division: divisionFromXp((profile?.season_xp ?? 0) + XP_REWARDS.formCheck),
  };
  if (streakResult.usedRestToken) {
    userUpdate.rest_tokens = streakResult.tokensLeft;
  }
  await supabase.from("users").update(userUpdate).eq("id", user.id);

  await refreshGymCred(supabase, user.id);

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  revalidatePath("/coach/form-check");
  redirect("/workouts?message=Form+check+session+logged");
}

export async function saveGhostSession(formData: FormData) {
  const exercise = formData.get("exercise");
  const reps = formData.get("reps");
  const formScore = formData.get("form_score");
  const metricsJson = formData.get("metrics_json");

  if (typeof exercise !== "string" || typeof metricsJson !== "string") {
    redirect("/coach/ghost?error=Invalid+session+data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let metrics: Json = [];
  try {
    metrics = JSON.parse(metricsJson) as Json;
  } catch {
    redirect("/coach/ghost?error=Invalid+metrics");
  }

  await supabase.from("ghost_sessions").insert({
    user_id: user.id,
    exercise,
    reps: Number(reps) || 0,
    form_score: Number(formScore) || null,
    metrics,
  });

  revalidatePath("/coach/ghost");
  redirect("/coach/ghost?message=Ghost+rep+saved");
}

export async function setAccountabilityPartner(formData: FormData) {
  const partnerEmail = formData.get("partner_email");
  if (typeof partnerEmail !== "string" || !partnerEmail.trim()) {
    redirect("/profile?error=Enter+partner+email");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("users")
    .select("id")
    .eq("email", partnerEmail.trim().toLowerCase())
    .maybeSingle();

  if (!partner || partner.id === user.id) {
    redirect("/profile?error=Partner+not+found");
  }

  await supabase
    .from("users")
    .update({ accountability_partner_id: partner.id })
    .eq("id", user.id);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?message=Accountability+partner+linked");
}

export async function submitHallOfFame(formData: FormData) {
  const exercise = formData.get("exercise_name");
  const weight = formData.get("weight_kg");
  const reps = formData.get("reps");

  if (typeof exercise !== "string" || !exercise.trim()) {
    redirect("/community?error=Exercise+required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (!profile?.gym_id) redirect("/community?error=Join+a+gym+first");

  const weightKg = Number(weight);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    redirect("/community?error=Valid+weight+required");
  }

  await supabase.from("gym_hall_of_fame").insert({
    gym_id: profile.gym_id,
    user_id: user.id,
    exercise_name: exercise.trim(),
    weight_kg: weightKg,
    reps: Number(reps) || 1,
  });

  await awardXpAndCred(supabase, user.id, XP_REWARDS.pr);
  revalidatePath("/community");
  redirect("/community?message=PR+added+to+Hall+of+Fame");
}

export async function setupGym(formData: FormData) {
  const name = formData.get("gym_name");
  const code = formData.get("check_in_code");
  if (typeof name !== "string" || !name.trim()) {
    redirect("/owner?error=Gym+name+required");
  }
  const checkCode =
    typeof code === "string" && code.trim()
      ? code.trim().toUpperCase()
      : name.trim().slice(0, 4).toUpperCase() + "-2025";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  const { data: gym, error } = await supabase
    .from("gyms")
    .insert({
      name: name.trim(),
      slug,
      owner_id: user.id,
      check_in_code: checkCode,
    })
    .select("id")
    .single();

  if (error || !gym) {
    redirect(`/owner?error=${encodeURIComponent(error?.message ?? "Failed")}`);
  }

  await supabase
    .from("users")
    .update({ gym_id: gym.id, role: "owner" })
    .eq("id", user.id);

  const defaults = [
    { name: "Squat Rack 1", zone: "free weights" },
    { name: "Squat Rack 2", zone: "free weights" },
    { name: "Bench Press", zone: "free weights" },
    { name: "Cable Station", zone: "machines" },
    { name: "Treadmill Row", zone: "cardio" },
  ];
  await supabase.from("gym_equipment").insert(
    defaults.map((d) => ({ gym_id: gym.id, ...d }))
  );

  revalidatePath("/owner");
  revalidatePath("/check-in");
  revalidatePath("/equipment");
  redirect(`/owner?message=Gym+created.+Check-in+code:+${checkCode}`);
}
