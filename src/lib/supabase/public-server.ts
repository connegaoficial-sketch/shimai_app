import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Stateless server client for public reads (menu, settings).
 * Prefer this over the cookie SSR client when no user session is needed.
 */
export function createPublicServerClient() {
  const { url, key } = getSupabasePublicEnv();

  return createClient<Database, "shimai">(url, key, {
    db: { schema: "shimai" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
