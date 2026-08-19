import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client scoped to schema `shimai`.
 * Do not add business logic here — UI stays dumb.
 *
 * Requires `shimai` in Supabase Dashboard → Settings → API → Exposed schemas.
 */
export function createClient() {
  const { url, key } = getSupabasePublicEnv();
  return createBrowserClient<Database, "shimai">(url, key, {
    db: { schema: "shimai" },
  });
}
