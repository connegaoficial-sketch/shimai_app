import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { fetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";
import type { Database } from "@/types/database";

type ServiceRoleClient = SupabaseClient<Database, "shimai">;

let serviceRoleClient: ServiceRoleClient | null = null;

/**
 * Server-only service-role client (bypasses RLS).
 * Never import this into Client Components.
 */
export function createServiceRoleClient(): ServiceRoleClient {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/\r/g, "");

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  serviceRoleClient = createClient<Database, "shimai">(url, key, {
    db: { schema: "shimai" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });

  return serviceRoleClient;
}
