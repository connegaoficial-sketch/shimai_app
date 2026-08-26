"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type DriverNotificationListenerProps = {
  driverId: string;
};

type Toast = {
  id: string;
  orderId: string | null;
  title: string;
  body: string;
};

export function DriverNotificationListener({
  driverId,
}: DriverNotificationListenerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`driver-notifications-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "shimai",
          table: "driver_notifications",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            order_id?: string | null;
            title?: string;
            body?: string;
          };

          if (!row.id) return;

          setToast({
            id: row.id,
            orderId: row.order_id ?? null,
            title: row.title ?? "Nuevo reparto",
            body: row.body ?? "",
          });

          router.refresh();

          window.setTimeout(() => {
            setToast((current) =>
              current?.id === row.id ? null : current,
            );
          }, 8000);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driverId, router, supabase]);

  if (!toast) return null;

  const href = toast.orderId
    ? `/driver/orders/${toast.orderId}`
    : "/driver";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(4.5rem,env(safe-area-inset-top,0px))] z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <Link
        href={href}
        onClick={() => setToast(null)}
        className="pointer-events-auto w-full max-w-lg rounded-md border border-shimai-gold/45 bg-shimai-black/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-opacity hover:opacity-95"
      >
        <p className="font-sans text-sm font-medium text-shimai-gold">
          {toast.title}
        </p>
        <p className="mt-1 font-sans text-sm text-shimai-ivory/85">
          {toast.body}
        </p>
        <p className="mt-2 font-sans text-xs text-shimai-ivory/45">
          Toca para abrir el pedido →
        </p>
      </Link>
    </div>
  );
}
