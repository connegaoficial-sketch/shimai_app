import { haversineKm } from "@/lib/delivery/haversine";
import { copyDriverNearby } from "@/lib/notifications/events";
import { notifyClient } from "@/lib/notifications/dispatch";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const NEARBY_KM = 0.5;
const NEARBY_COOLDOWN_MS = 30 * 60 * 1000;

type ShimaiClient = SupabaseClient<Database, "shimai">;

export async function maybeNotifyDriverNearby(input: {
  supabase: ShimaiClient;
  orderId: string;
  driverLat: number;
  driverLng: number;
}): Promise<void> {
  const { data: order } = await input.supabase
    .from("orders")
    .select("id, status, delivery_lat, delivery_lng")
    .eq("id", input.orderId)
    .maybeSingle();

  if (
    !order ||
    order.status !== "in_transit" ||
    order.delivery_lat == null ||
    order.delivery_lng == null
  ) {
    return;
  }

  const distanceKm = haversineKm(
    input.driverLat,
    input.driverLng,
    Number(order.delivery_lat),
    Number(order.delivery_lng),
  );

  if (distanceKm > NEARBY_KM) return;

  const since = new Date(Date.now() - NEARBY_COOLDOWN_MS).toISOString();
  const { data: recent } = await input.supabase
    .from("notifications")
    .select("id")
    .eq("audience", "client")
    .eq("order_id", input.orderId)
    .eq("kind", "driver_nearby")
    .gte("created_at", since)
    .limit(1);

  if (recent?.length) return;

  await notifyClient({
    supabase: input.supabase,
    payload: copyDriverNearby(input.orderId),
  });
}
