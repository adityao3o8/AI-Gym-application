"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { INJURY_OPTIONS, type InjuryFlag } from "@/lib/injury-coach";

export async function updateProfile(formData: FormData) {
  const fullNameRaw = formData.get("full_name");
  const avatarRaw = formData.get("avatar_url");
  const injuryRaw = formData.getAll("injury_flags");

  const full_name =
    typeof fullNameRaw === "string" && fullNameRaw.trim().length > 0
      ? fullNameRaw.trim()
      : null;
  const avatar_url =
    typeof avatarRaw === "string" && avatarRaw.trim().length > 0
      ? avatarRaw.trim()
      : null;

  const valid = new Set(INJURY_OPTIONS.map((o) => o.id));
  const injury_flags = injuryRaw
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is InjuryFlag => valid.has(v as InjuryFlag));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("users")
    .update({ full_name, avatar_url, injury_flags })
    .eq("id", user.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  redirect("/profile?message=Profile+updated");
}
