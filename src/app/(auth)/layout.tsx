import { AuthShell } from "@/components/layout/auth-shell";
import { PageTransition } from "@/components/ui/page-transition";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell>
      <PageTransition>{children}</PageTransition>
    </AuthShell>
  );
}
