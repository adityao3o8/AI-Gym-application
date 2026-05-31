import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Service-role client for trusted server-only operations (webhooks, seeds).
 * Bypasses RLS — never import in Client Components or expose to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** Anon-key admin is not used; re-export URL helper for scripts. */
export { getSupabaseAnonKey, getSupabaseUrl };
