"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const fullNameRaw = formData.get("full_name");
  const avatarRaw = formData.get("avatar_url");

  const full_name =
    typeof fullNameRaw === "string" && fullNameRaw.trim().length > 0
      ? fullNameRaw.trim()
      : null;
  const avatar_url =
    typeof avatarRaw === "string" && avatarRaw.trim().length > 0
      ? avatarRaw.trim()
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("users")
    .update({ full_name, avatar_url })
    .eq("id", user.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?message=Profile+updated");
}
