"use client";

import { useEffect, useRef, useState } from "react";
import { OrdersKanban } from "@/components/admin/OrdersKanban";
import { useAdminOrderAlerts } from "@/hooks/useAdminOrderAlerts";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { usePushSubscribe } from "@/hooks/usePushSubscribe";
import type { AdminOrder } from "@/lib/admin/order-types";

export function OrdersKanbanLive({ orders }: { orders: AdminOrder[] }) {
  const {
    soundEnabled,
    alert,
    toggleSound,
    testChime,
    triggerOrderAlert,
    dismissAlert,
    alertedOrderIdsRef,
  } = useAdminOrderAlerts();

  const {
    permission: pushPermission,
    subscribed: pushSubscribed,
    requestPermission: requestPushPermission,
  } = usePushSubscribe({ audience: "admin", promptAfterMs: 1500 });

  const isInitialMountRef = useRef(true);

  // Initial check: if there is any active pending/preparing order created recently (<15m),
  // alert the admin so they don't miss it even if they opened the app after it was placed!
  useEffect(() => {
    if (isInitialMountRef.current) {
      const now = Date.now();
      const recentActiveOrder = orders.find((o) => {
        const isActive =
          o.status === "pending_payment" ||
          o.status === "confirmed" ||
          o.status === "preparing";
        const ageMs = now - new Date(o.created_at).getTime();
        return isActive && ageMs < 15 * 60 * 1000;
      });

      for (const order of orders) {
        if (recentActiveOrder && order.id === recentActiveOrder.id) {
          continue; // Will trigger alert below
        }
        alertedOrderIdsRef.current.add(order.id);
      }

      if (recentActiveOrder) {
        triggerOrderAlert({
          id: recentActiveOrder.id,
          clientName: recentActiveOrder.client_phone || "Cliente invitado",
          total: Number(recentActiveOrder.total) || 0,
          itemCount: recentActiveOrder.order_items.reduce(
            (s, i) => s + i.quantity,
            0,
          ),
        });
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

  async function handleTestPush(): Promise<{
    ok: boolean;
    sent?: number;
    failed?: number;
  }> {
    try {
      const res = await fetch("/api/push/test-admin", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        sent?: number;
        failed?: number;
      };
      return {
        ok: Boolean(data.ok && (data.sent ?? 0) > 0),
        sent: data.sent,
        failed: data.failed,
      };
    } catch {
      return { ok: false };
    }
  }

  return (
    <OrdersKanban
      orders={orders}
      alert={alert}
      onDismissAlert={dismissAlert}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      onTestChime={testChime}
      pushSubscribed={pushSubscribed}
      pushPermission={pushPermission}
      onEnablePush={requestPushPermission}
      onTestPush={handleTestPush}
    />
  );
}
