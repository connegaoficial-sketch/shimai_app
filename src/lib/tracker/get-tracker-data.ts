import { createPublicServerClient } from "@/lib/supabase/public-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isServiceRoleKeyConfigured } from "@/lib/supabase/env";
import type { OrderStatus } from "@/types/database";

export type TrackerSnapshot = {
  id: string;
  status: OrderStatus;
  delivery_lat: number | null;
  delivery_lng: number | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_lat: number | null;
  driver_lng: number | null;
};

function parseSnapshot(raw: unknown): TrackerSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.status !== "string") return null;

  return {
    id: row.id,
    status: row.status as OrderStatus,
    delivery_lat:
      typeof row.delivery_lat === "number" ? row.delivery_lat : null,
    delivery_lng:
      typeof row.delivery_lng === "number" ? row.delivery_lng : null,
    driver_id: typeof row.driver_id === "string" ? row.driver_id : null,
    driver_name:
      typeof row.driver_name === "string" ? row.driver_name : null,
    driver_lat: typeof row.driver_lat === "number" ? row.driver_lat : null,
    driver_lng: typeof row.driver_lng === "number" ? row.driver_lng : null,
  };
}

async function fetchViaRpc(orderId: string): Promise<TrackerSnapshot | null> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("get_public_tracker", {
    p_order_id: orderId,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[shimai tracker] RPC get_public_tracker:", error.message);
    }
    return null;
  }
  return parseSnapshot(data);
}

async function fetchViaServiceRole(
  orderId: string,
): Promise<TrackerSnapshot | null> {
  const supabase = createServiceRoleClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, delivery_lat, delivery_lng, driver_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    if (process.env.NODE_ENV === "development" && orderError) {
      console.warn("[shimai tracker] service role:", orderError.message);
    }
    return null;
  }

  const [{ data: location }, driverProfileResult] = await Promise.all([
    supabase
      .from("driver_locations")
      .select("lat, lng")
      .eq("order_id", orderId)
      .maybeSingle(),
    order.driver_id
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.driver_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: order.id,
    status: order.status as OrderStatus,
    delivery_lat:
      order.delivery_lat != null ? Number(order.delivery_lat) : null,
    delivery_lng:
      order.delivery_lng != null ? Number(order.delivery_lng) : null,
    driver_id: order.driver_id,
    driver_name: driverProfileResult.data?.full_name?.trim() ?? null,
    driver_lat: location ? Number(location.lat) : null,
    driver_lng: location ? Number(location.lng) : null,
  };
}

/** Loads tracker data for magic-link /tracker/[orderId] pages. */
export async function getTrackerSnapshot(
  orderId: string,
): Promise<TrackerSnapshot | null> {
  const viaRpc = await fetchViaRpc(orderId);
  if (viaRpc) return viaRpc;

  if (isServiceRoleKeyConfigured()) {
    return fetchViaServiceRole(orderId);
  }

  return null;
}
