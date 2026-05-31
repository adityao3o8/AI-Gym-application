import type { NavItem } from "@/types";

export const APP_NAME = "GYMERS";

export const MEMBER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Workouts", href: "/workouts" },
  { label: "AI Coach", href: "/coach" },
  { label: "Records", href: "/records" },
  { label: "Rewards", href: "/rewards" },
];

export const OWNER_NAV: NavItem[] = [
  { label: "Owner", href: "/owner" },
];

export const AUTH_ROUTES = ["/login", "/signup"] as const;
