"use client";

import { useEffect, useRef } from "react";
import { OrdersKanban } from "@/components/admin/OrdersKanban";
import { useAdminOrderAlerts } from "@/hooks/useAdminOrderAlerts";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import type { AdminOrder } from "@/lib/admin/order-types";

export function OrdersKanbanLive({ orders }: { orders: AdminOrder[] }) {
  const {
    soundEnabled,
    notificationPermission,
    alert,
    toggleSound,
    testChime,
    requestNotificationPermission,
    triggerOrderAlert,
    dismissAlert,
    alertedOrderIdsRef,
  } = useAdminOrderAlerts();

  const isInitialMountRef = useRef(true);

  // Seed existing order IDs on mount so we never alert on page reload for existing orders
  useEffect(() => {
    if (isInitialMountRef.current) {
      for (const order of orders) {
        alertedOrderIdsRef.current.add(order.id);
      }
      isInitialMountRef.current = false;
      return;
    }

    // Check if new orders arrived through router.refresh / poll fallback
    for (const order of orders) {
      if (!alertedOrderIdsRef.current.has(order.id)) {
        triggerOrderAlert({
          id: order.id,
          clientName: order.client_phone || "Cliente invitado",
          total: Number(order.total) || 0,
          itemCount: order.order_items.reduce((s, i) => s + i.quantity, 0),
        });
      }
    }
  }, [orders, triggerOrderAlert, alertedOrderIdsRef]);

  // Realtime instant push via Supabase channel (zero polling delay) + 5s auto-refresh
  useLiveRefresh({
    table: "orders",
    pollMs: 5000,
    onInsert: (payload) => {
      const newOrder = payload.new as {
        id?: string;
        total?: number | string;
        client_phone?: string | null;
      };
      if (newOrder.id) {
        triggerOrderAlert({
          id: newOrder.id,
          clientName: newOrder.client_phone || "Nuevo Pedido",
          total: Number(newOrder.total) || 0,
        });
      }
    },
  });

  return (
    <OrdersKanban
      orders={orders}
      alert={alert}
      onDismissAlert={dismissAlert}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      onTestChime={testChime}
      notificationPermission={notificationPermission}
      onRequestNotificationPermission={requestNotificationPermission}
    />
  );
}
