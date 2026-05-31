"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "blue" | "purple" | "teal";
};

const glowClasses: Record<NonNullable<GlassCardProps["glow"]>, string> = {
  blue: "hover:shadow-[0_0_40px_rgba(123,57,252,0.28)]",
  purple: "hover:shadow-[0_0_40px_rgba(248,123,82,0.24)]",
  teal: "hover:shadow-[0_0_40px_rgba(151,89,255,0.26)]",
};

export function GlassCard({ children, className, hover = false, glow }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={hover ? { type: "spring", stiffness: 300, damping: 22 } : undefined}
      className={cn("glass-card", glow ? glowClasses[glow] : undefined, className)}
    >
      {children}
    </motion.div>
  );
}
