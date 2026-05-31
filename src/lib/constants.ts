export const APP_NAME = "GYMERS";

export const MEMBER_NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Workouts", href: "/workouts" },
  { label: "AI Coach", href: "/coach" },
  { label: "Community", href: "/community" },
  { label: "Check-in", href: "/check-in" },
  { label: "Season", href: "/season" },
  { label: "Records", href: "/records" },
  { label: "Rewards", href: "/rewards" },
] as const;

export const OWNER_NAV = [{ label: "Owner", href: "/owner" }] as const;

export const AUTH_ROUTES = ["/login", "/signup"] as const;

export type NavItem = { label: string; href: string };
