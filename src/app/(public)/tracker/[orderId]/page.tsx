import { notFound } from "next/navigation";

import { TrackerClient } from "@/components/tracker/TrackerClient";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { OrderStatus } from "@/types/database";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export const dynamic = "force-dynamic";

export default async function TrackerPage({ params }: PageProps) {
  const { orderId } = await params;
  const supabase = createServiceRoleClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, delivery_lat, delivery_lng, driver_id, profiles!orders_driver_id_fkey ( full_name )",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: location } = await supabase
    .from("driver_locations")
    .select("lat, lng")
    .eq("order_id", orderId)
    .maybeSingle();

  const customer =
    order.delivery_lat != null && order.delivery_lng != null
      ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
      : null;

  const driverProfile = order.profiles as { full_name: string | null } | null;

  return (
    <TrackerClient
      orderId={order.id}
      initialStatus={order.status as OrderStatus}
      customer={customer}
      initialDriver={
        location
          ? { lat: Number(location.lat), lng: Number(location.lng) }
          : null
      }
      driverName={driverProfile?.full_name?.trim() || null}
    />
  );
}
