type SupabasePublicEnv = {
  url: string;
  key: string;
};

/**
 * Public Supabase credentials for Data API + Auth.
 * Uses the legacy JWT anon key only — `sb_publishable_…` is rejected by
 * PostgREST on this project ("Invalid API key").
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  if (!key.startsWith("eyJ")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must be the JWT anon key (starts with eyJ), not sb_publishable_…",
    );
  }

  return { url, key };
}
