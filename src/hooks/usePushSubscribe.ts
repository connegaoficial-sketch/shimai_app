"use client";

import { useCallback, useEffect, useState } from "react";

type PushAudience = "driver" | "client";

type UsePushSubscribeOptions = {
  audience: PushAudience;
  /** Required for client tracker subscriptions */
  orderId?: string;
  /** Auto-prompt once after delay (ms). 0 = manual only. */
  promptAfterMs?: number;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function usePushSubscribe({
  audience,
  orderId,
  promptAfterMs = 1200,
}: UsePushSubscribeOptions) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async () => {
    if (pending) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }
    if (audience === "client" && !orderId) return false;

    setPending(true);
    try {
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          orderId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        }),
      });

      if (!res.ok) return false;
      setSubscribed(true);
      setPermission(Notification.permission);
      return true;
    } catch {
      return false;
    } finally {
      setPending(false);
    }
  }, [audience, orderId, pending]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      return subscribe();
    }
    return false;
  }, [subscribe]);

  useEffect(() => {
    if (promptAfterMs <= 0) return;
    if (permission !== "default") return;
    const t = window.setTimeout(() => {
      void requestPermission();
    }, promptAfterMs);
    return () => window.clearTimeout(t);
  }, [permission, promptAfterMs, requestPermission]);

  return {
    permission,
    subscribed,
    pending,
    requestPermission,
    subscribe,
  };
}
