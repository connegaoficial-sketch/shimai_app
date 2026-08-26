import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type ShimaiClient = SupabaseClient<Database, "shimai">;

const ACTIVE_STATUSES = ["ready_for_pickup", "in_transit"] as const;

/**
 * Pick the driver with the fewest active deliveries (ready + in transit).
 * Tie-break: earliest profile id for stable round-robin-ish behavior.
 */
export async function pickDriverForOrder(
  supabase: ShimaiClient,
): Promise<string | null> {
  const { data: drivers, error: driversError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "driver")
    .order("created_at", { ascending: true });

  if (driversError || !drivers?.length) return null;

  const { data: activeOrders, error: ordersError } = await supabase
    .from("orders")
    .select("driver_id")
    .in("status", [...ACTIVE_STATUSES])
    .not("driver_id", "is", null);

  if (ordersError) return drivers[0]?.id ?? null;

  const load = new Map<string, number>();
  for (const driver of drivers) {
    load.set(driver.id, 0);
  }
  for (const row of activeOrders ?? []) {
    if (!row.driver_id) continue;
    load.set(row.driver_id, (load.get(row.driver_id) ?? 0) + 1);
  }

  let bestId = drivers[0]!.id;
  let bestLoad = load.get(bestId) ?? 0;

  for (const driver of drivers) {
    const count = load.get(driver.id) ?? 0;
    if (count < bestLoad) {
      bestLoad = count;
      bestId = driver.id;
    }
  }

  return bestId;
}

export async function assignDriverToOrder(
  supabase: ShimaiClient,
  orderId: string,
): Promise<{ driverId: string | null; assigned: boolean }> {
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, driver_id")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError || !order) {
    return { driverId: null, assigned: false };
  }

  if (order.status !== "ready_for_pickup") {
    return { driverId: order.driver_id, assigned: false };
  }

  if (order.driver_id) {
    return { driverId: order.driver_id, assigned: false };
  }

  const driverId = await pickDriverForOrder(supabase);
  if (!driverId) {
    return { driverId: null, assigned: false };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ driver_id: driverId })
    .eq("id", orderId)
    .eq("status", "ready_for_pickup")
    .is("driver_id", null);

  if (updateError) {
    return { driverId: null, assigned: false };
  }

  return { driverId, assigned: true };
}
