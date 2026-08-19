"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

const TrackerMap = dynamic(
  () =>
    import("@/components/tracker/TrackerMap").then((mod) => mod.TrackerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-shimai-surface font-sans text-sm text-shimai-ivory/40">
        Cargando mapa…
      </div>
    ),
  },
);

type TrackerClientProps = {
  orderId: string;
  initialStatus: OrderStatus;
  customer: { lat: number; lng: number } | null;
  initialDriver: { lat: number; lng: number } | null;
  driverName: string | null;
};

function statusCopy(status: OrderStatus): string {
  switch (status) {
    case "pending_payment":
      return "Esperando confirmación de pago";
    case "confirmed":
      return "Pedido confirmado";
    case "preparing":
      return "Tu pedido se está preparando";
    case "ready_for_pickup":
      return "Listo — el repartidor va en camino a recogerlo";
    case "in_transit":
      return "Tu pedido está en camino";
    case "delivered":
      return "Entregado — ¡buen provecho!";
    case "cancelled":
      return "Pedido cancelado";
    default:
      return status;
  }
}

export function TrackerClient({
  orderId,
  initialStatus,
  customer,
  initialDriver,
  driverName,
}: TrackerClientProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [driver, setDriver] = useState(initialDriver);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const locationChannel = supabase
      .channel(`driver-loc-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shimai",
          table: "driver_locations",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as { lat?: number; lng?: number } | null;
          if (
            row &&
            typeof row.lat === "number" &&
            typeof row.lng === "number"
          ) {
            setDriver({ lat: row.lat, lng: row.lng });
          }
        },
      )
      .subscribe();

    const statusChannel = supabase
      .channel(`presence-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shimai",
          table: "tracker_presence",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as { status?: OrderStatus } | null;
          if (row?.status) {
            setStatus(row.status);
            if (row.status === "delivered") {
              // keep last known pin; GPS stops on driver side
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(locationChannel);
      void supabase.removeChannel(statusChannel);
    };
  }, [orderId, supabase]);

  return (
    <div className="flex h-dvh flex-col bg-shimai-black text-shimai-ivory">
      <header className="shrink-0 px-4 py-3">
        <p className="font-serif text-lg tracking-wide text-shimai-ivory">
          SHIMAI
        </p>
      </header>

      <div className="min-h-0 flex-[0.7]">
        <TrackerMap customer={customer} driver={driver} />
      </div>

      <div className="flex-[0.3] border-t border-white/[0.08] bg-shimai-black px-4 py-4">
        <div className="mx-auto max-w-lg rounded-md border border-shimai-gold/25 bg-shimai-surface/70 p-4">
          <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-gold">
            Estado
          </p>
          <p className="mt-2 font-serif text-2xl text-shimai-ivory">
            {statusCopy(status)}
          </p>
          {driverName ? (
            <p className="mt-2 font-sans text-sm text-shimai-ivory/55">
              Repartidor: {driverName}
            </p>
          ) : (
            <p className="mt-2 font-sans text-sm text-shimai-ivory/45">
              Asignando repartidor…
            </p>
          )}
          {status === "in_transit" ? (
            <p className="mt-3 font-sans text-xs text-shimai-gold/80">
              Pin dorado = repartidor · punto sakura = tu dirección
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
