import { notFound } from "next/navigation";

import { TrackerClient } from "@/components/tracker/TrackerClient";
import { getTrackerSnapshot } from "@/lib/tracker/get-tracker-data";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TrackerPage({ params }: PageProps) {
  const { orderId } = await params;

  if (!UUID_RE.test(orderId)) {
    notFound();
  }

  const snapshot = await getTrackerSnapshot(orderId);
  if (!snapshot) {
    notFound();
  }

  const customer =
    snapshot.delivery_lat != null && snapshot.delivery_lng != null
      ? { lat: snapshot.delivery_lat, lng: snapshot.delivery_lng }
      : null;

  const initialDriver =
    snapshot.driver_lat != null && snapshot.driver_lng != null
      ? { lat: snapshot.driver_lat, lng: snapshot.driver_lng }
      : null;

  return (
    <TrackerClient
      orderId={snapshot.id}
      initialStatus={snapshot.status}
      customer={customer}
      initialDriver={initialDriver}
      driverName={snapshot.driver_name}
    />
  );
}
