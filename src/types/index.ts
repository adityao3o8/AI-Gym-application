export type {
  UserRole,
  UserProfile,
  Gym,
  Workout,
  Trophy,
} from "@/types/database";

import type { UserRole } from "@/types/database";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  roles?: UserRole[];
};

export type PageMeta = {
  title: string;
  description: string;
  badge?: string;
};
