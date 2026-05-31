import { cn } from "@/lib/utils";

type AnimatedBgProps = {
  className?: string;
};

export function AnimatedBg({ className }: AnimatedBgProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className
      )}
      aria-hidden
    >
      <div
        className="absolute -inset-[20%] animate-aurora opacity-40 blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(123,57,252,0.35), rgba(248,123,82,0.14), rgba(123,57,252,0.0) 35%, rgba(151,89,255,0.32), rgba(248,123,82,0.10), rgba(123,57,252,0.35))",
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(123,57,252,0.30), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 110%, rgba(248,123,82,0.14), transparent 55%)",
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-[0.22] mix-blend-overlay" />
    </div>
  );
}
