"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePushSubscribe } from "@/hooks/usePushSubscribe";

type PushPermissionBannerProps = {
  audience: "driver" | "client";
  orderId?: string;
  title: string;
  description: string;
};

export function PushPermissionBanner({
  audience,
  orderId,
  title,
  description,
}: PushPermissionBannerProps) {
  const [mounted, setMounted] = useState(false);
  const { permission, subscribed, pending, requestPermission } =
    usePushSubscribe({
      audience,
      orderId,
      promptAfterMs: 1800,
    });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!("Notification" in window) || permission === "granted" || subscribed) {
    return null;
  }

  if (permission === "denied") {
    return (
      <p className="rounded-md border border-white/[0.08] bg-shimai-surface/60 px-3 py-2 font-sans text-xs text-shimai-ivory/50">
        Notificaciones bloqueadas en el navegador. Actívalas en ajustes del
        dispositivo para avisos de tu pedido.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-shimai-gold/30 bg-shimai-gold/10 px-4 py-3">
      <p className="font-sans text-sm font-medium text-shimai-gold">{title}</p>
      <p className="mt-1 font-sans text-xs leading-relaxed text-shimai-ivory/70">
        {description}
      </p>
      <Button
        size="sm"
        className="mt-3"
        disabled={pending}
        onClick={() => void requestPermission()}
      >
        {pending ? "Activando…" : "Permitir notificaciones"}
      </Button>
    </div>
  );
}
