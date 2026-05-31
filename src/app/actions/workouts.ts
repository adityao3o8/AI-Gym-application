"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  computeStreak,
  meetsCriteria,
  type TrophyCriteria,
} from "@/lib/gamification";

type Entry = {
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
};

function parseEntries(formData: FormData): Entry[] {
  const names = formData.getAll("exercise_name");
  const sets = formData.getAll("sets");
  const reps = formData.getAll("reps");
  const weights = formData.getAll("weight_kg");

  const entries: Entry[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (typeof name !== "string" || !name.trim()) continue;

    const setsVal = Number(sets[i]);
    const repsVal = Number(reps[i]);
    const weightRaw = weights[i];
    const weightVal =
      typeof weightRaw === "string" && weightRaw.trim() !== ""
        ? Number(weightRaw)
        : null;

    entries.push({
      exercise_name: name.trim(),
      sets: Number.isFinite(setsVal) && setsVal > 0 ? setsVal : 1,
      reps: Number.isFinite(repsVal) && repsVal > 0 ? repsVal : 1,
      weight_kg: weightVal !== null && Number.isFinite(weightVal) ? weightVal : null,
    });
  }
  return entries;
}

async function maybeAwardTrophies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  ctx: { workoutCount: number; streak: number }
) {
  const [{ data: allTrophies }, { data: earned }] = await Promise.all([
    supabase.from("trophies").select("id, criteria"),
    supabase.from("user_trophies").select("trophy_id").eq("user_id", userId),
  ]);

  if (!allTrophies) return;
  const earnedSet = new Set((earned ?? []).map((t) => t.trophy_id));

  const toAward = allTrophies
    .filter((t) => !earnedSet.has(t.id))
    .filter((t) => meetsCriteria(t.criteria as TrophyCriteria, ctx))
    .map((t) => ({ user_id: userId, trophy_id: t.id }));

  if (toAward.length > 0) {
    await supabase.from("user_trophies").insert(toAward);
  }
}

export async function createWorkout(formData: FormData) {
  const titleRaw = formData.get("title");
  const notesRaw = formData.get("notes");

  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0
      ? titleRaw.trim()
      : "Workout";
  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Please+log+in+to+continue");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id, streak_count, last_workout_at")
    .eq("id", user.id)
    .single();

  const now = new Date();
  const { newStreak } = computeStreak(
    profile?.streak_count ?? 0,
    profile?.last_workout_at ? new Date(profile.last_workout_at) : null,
    now
  );

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      gym_id: profile?.gym_id ?? null,
      title,
      notes,
      performed_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (workoutError || !workout) {
    redirect(
      `/workouts?error=${encodeURIComponent(workoutError?.message ?? "Could not create workout")}`
    );
  }

  const entries = parseEntries(formData);
  if (entries.length > 0) {
    const { error: entriesError } = await supabase.from("workout_entries").insert(
      entries.map((entry, index) => ({
        workout_id: workout.id,
        exercise_name: entry.exercise_name,
        sets: entry.sets,
        reps: entry.reps,
        weight_kg: entry.weight_kg,
        sort_order: index,
      }))
    );

    if (entriesError) {
      redirect(
        `/workouts?error=${encodeURIComponent(entriesError.message)}`
      );
    }
  }

  await supabase
    .from("users")
    .update({
      streak_count: newStreak,
      last_workout_at: now.toISOString(),
    })
    .eq("id", user.id);

  const { count: workoutCount } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  await maybeAwardTrophies(supabase, user.id, {
    workoutCount: workoutCount ?? 0,
    streak: newStreak,
  });

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  revalidatePath("/rewards");
  redirect("/workouts?message=Workout+logged");
}

export async function deleteWorkout(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") {
    redirect("/workouts?error=Invalid+workout");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", id);

  if (error) {
    redirect(`/workouts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  redirect("/workouts?message=Workout+deleted");
}
