import { createClient } from "@/lib/supabase/server";

type AdminGate =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string };

export async function requireAdminClient(): Promise<AdminGate> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string" || !userId) {
    return { ok: false, error: "No autenticada." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Sin permiso de administración." };
  }

  return { ok: true, supabase };
}
