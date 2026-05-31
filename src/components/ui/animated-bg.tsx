import { cn } from "@/lib/utils";

type AnimatedBgProps = {
  className?: string;
};

export function AnimatedBg({ className }: AnimatedBgProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute left-10 top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl animate-float" />
      <div className="absolute bottom-40 right-20 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl animate-float-slow" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl animate-float-fast" />
    </div>
  );
}
