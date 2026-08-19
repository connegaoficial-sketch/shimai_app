import { createClient } from "@/lib/supabase/server";

type DriverGate =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; driverId: string }
  | { ok: false; error: string };

export async function requireDriverClient(): Promise<DriverGate> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string" || !userId) {
    return { ok: false, error: "No autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "driver") {
    return { ok: false, error: "Sin permiso de repartidor." };
  }

  return { ok: true, supabase, driverId: userId };
}
