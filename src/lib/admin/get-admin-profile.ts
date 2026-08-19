import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getAdminProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string" || !userId) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return data;
}
