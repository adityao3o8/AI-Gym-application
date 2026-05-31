import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/ui/page-transition";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Please+log+in+to+continue");
  }

  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
