"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playOrderChime, unlockAudioContext } from "@/lib/audio/order-chime";

export type NewOrderAlert = {
  orderId: string;
  clientName: string;
  total: number;
  itemCount: number;
  timestamp: number;
};

const SOUND_STORAGE_KEY = "shimai_admin_sound_enabled";

export function useAdminOrderAlerts() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [alert, setAlert] = useState<NewOrderAlert | null>(null);

  const alertedOrderIdsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string>("");
  const titleIntervalRef = useRef<number | null>(null);

  // Initialize preferences on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    originalTitleRef.current = document.title;

    const storedSound = localStorage.getItem(SOUND_STORAGE_KEY);
    if (storedSound !== null) {
      setSoundEnabled(storedSound === "true");
    }

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Auto-unlock audio on first click anywhere in the page
    function handleFirstInteraction() {
      void unlockAudioContext();
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    }
    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      if (titleIntervalRef.current) {
        window.clearInterval(titleIntervalRef.current);
      }
    };
  }, []);

  // Flash document title when alert is active
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!alert) {
      if (titleIntervalRef.current) {
        window.clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
      return;
    }

    let isFlash = false;
    const shortId = alert.orderId.slice(0, 6).toUpperCase();
    titleIntervalRef.current = window.setInterval(() => {
      isFlash = !isFlash;
      document.title = isFlash
        ? `🔴 ¡NUEVO PEDIDO #${shortId}! - SHIMAI`
        : `🥢 Cocina - ${originalTitleRef.current || "SHIMAI"}`;
    }, 1000);

    return () => {
      if (titleIntervalRef.current) {
        window.clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [alert]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      if (next) {
        void unlockAudioContext();
        void playOrderChime(1);
      }
      return next;
    });
  }, []);

  const testChime = useCallback(async () => {
    await unlockAudioContext();
    await playOrderChime(2);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied" as NotificationPermission;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        try {
          new Notification("🥢 SHIMAI · Cocina", {
            body: "Las alertas de nuevos pedidos en segundo plano están activadas.",
            icon: "/icon-192x192.png",
          });
        } catch {
          // Some browsers in iframe might throw
        }
      }
      return permission;
    } catch {
      return "denied" as NotificationPermission;
    }
  }, []);

  const dismissAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const triggerOrderAlert = useCallback(
    (order: {
      id: string;
      clientName?: string;
      total: number;
      itemCount?: number;
    }) => {
      if (alertedOrderIdsRef.current.has(order.id)) {
        return;
      }
      alertedOrderIdsRef.current.add(order.id);

      const clientName = order.clientName || "Cliente invitado";
      const total = Number(order.total) || 0;
      const itemCount = order.itemCount || 1;

      // 1. Play kitchen sound
      if (soundEnabled) {
        void playOrderChime(2);
      }

      // 2. Vibrate device if supported
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 400]);
        } catch {
          // Ignore vibration error
        }
      }

      // 3. Show native OS notification (especially when tab in background)
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const shortId = order.id.slice(0, 8).toUpperCase();
          const notif = new Notification(`🥢 ¡Nuevo Pedido #${shortId}!`, {
            body: `${clientName} · ${itemCount} ${
              itemCount === 1 ? "ítem" : "ítems"
            } · $${total.toFixed(2)} MXN`,
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
            tag: `shimai-order-${order.id}`,
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {
          // Ignore notification error
        }
      }

      // 4. Set in-app visual alert
      setAlert({
        orderId: order.id,
        clientName,
        total,
        itemCount,
        timestamp: Date.now(),
      });
    },
    [soundEnabled],
  );

  return {
    soundEnabled,
    notificationPermission,
    alert,
    toggleSound,
    testChime,
    requestNotificationPermission,
    triggerOrderAlert,
    dismissAlert,
    alertedOrderIdsRef,
  };
}
