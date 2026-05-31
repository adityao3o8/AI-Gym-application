import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-col">
      <Navbar isAuthenticated={Boolean(user)} signOutAction={signOut} />
      <main className="flex-1 pt-24">{children}</main>
      <Footer />
    </div>
  );
}
