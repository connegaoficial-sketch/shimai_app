"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ClientNotificationListenerProps = {
  orderId: string;
};

type Toast = {
  id: string;
  title: string;
  body: string;
};

export function ClientNotificationListener({
  orderId,
}: ClientNotificationListenerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`client-notifications-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "shimai",
          table: "client_notifications",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            title?: string;
            body?: string;
          };
          if (!row.id) return;

          setToast({
            id: row.id,
            title: row.title ?? "Actualización de tu pedido",
            body: row.body ?? "",
          });

          router.refresh();

          window.setTimeout(() => {
            setToast((current) => (current?.id === row.id ? null : current));
          }, 8000);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, router, supabase]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <Link
        href={`/tracker/${orderId}`}
        onClick={() => setToast(null)}
        className="pointer-events-auto w-full max-w-lg rounded-md border border-shimai-sakura/45 bg-shimai-black/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      >
        <p className="font-sans text-sm font-medium text-shimai-sakura">
          {toast.title}
        </p>
        <p className="mt-1 font-sans text-sm text-shimai-ivory/85">
          {toast.body}
        </p>
      </Link>
    </div>
  );
}
