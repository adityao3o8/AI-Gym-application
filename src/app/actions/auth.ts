"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resendConfirmation(formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string" || email.length === 0) {
    redirect("/login?error=Enter+your+email+first");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email.trim())}`
    );
  }

  redirect(
    `/login?message=Confirmation+email+resent.+Check+your+inbox.&email=${encodeURIComponent(email.trim())}`
  );
}
