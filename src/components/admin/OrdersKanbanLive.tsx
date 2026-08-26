"use client";

import { OrdersKanban } from "@/components/admin/OrdersKanban";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import type { AdminOrder } from "@/lib/admin/order-types";

export function OrdersKanbanLive({ orders }: { orders: AdminOrder[] }) {
  useLiveRefresh({ table: "orders", pollMs: 3000 });
  return <OrdersKanban orders={orders} />;
}
