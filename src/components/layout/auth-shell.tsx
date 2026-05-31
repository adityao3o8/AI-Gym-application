import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white">
          <Dumbbell className="size-5" />
        </span>
        {APP_NAME}
      </Link>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
