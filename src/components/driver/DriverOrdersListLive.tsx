"use client";

import { DriverOrdersList } from "@/components/driver/DriverOrdersList";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import type { DriverOrderCard } from "@/components/driver/DriverOrdersList";

export function DriverOrdersListLive({
  assigned,
  available,
  driverId,
}: {
  assigned: DriverOrderCard[];
  available: DriverOrderCard[];
  driverId: string;
}) {
  useLiveRefresh({ table: "orders", pollMs: 3000 });
  useLiveRefresh({
    table: "notifications",
    filter: `recipient_id=eq.${driverId}`,
    pollMs: 3000,
  });

  return <DriverOrdersList assigned={assigned} available={available} />;
}
