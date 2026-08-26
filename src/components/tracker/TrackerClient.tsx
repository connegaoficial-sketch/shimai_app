"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PushPermissionBanner } from "@/components/pwa/PushPermissionBanner";
import { ClientNotificationCenter } from "@/components/tracker/ClientNotificationCenter";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
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

function driverStatusLine(input: {
  status: OrderStatus;
  driverName: string | null;
  hasDriverPin: boolean;
}): string | null {
  if (input.status === "in_transit") {
    if (input.driverName) {
      return `Repartidor: ${input.driverName} · en ruta hacia ti`;
    }
    if (input.hasDriverPin) {
      return "Ubicación en vivo · siguiendo en el mapa";
    }
    return "Repartidor en ruta hacia ti";
  }

  if (input.driverName) {
    return `Repartidor: ${input.driverName}`;
  }
  if (input.hasDriverPin || input.status === "delivered") {
    return "Repartidor en camino";
  }
  if (input.status === "ready_for_pickup") {
    return "Esperando que un repartidor tome el pedido…";
  }
  if (input.status === "preparing" || input.status === "confirmed") {
    return null;
  }
  return "Asignando repartidor…";
}

/** Soft kitchen activity — staggered sakura orbs + breathing glow. */
function PreparingMotion() {
  return (
    <div
      className="shimai-prep-motion mt-3"
      aria-hidden
    >
      <span className="shimai-prep-glow" />
      <span className="shimai-prep-orb" />
      <span className="shimai-prep-orb" />
      <span className="shimai-prep-orb" />
      <span className="font-sans text-xs tracking-wide text-shimai-sakura/70">
        En cocina
      </span>
    </div>
  );
}

/** Driver en route to pick up — gold dot travels toward the order. */
function PickupMotion() {
  return (
    <div className="shimai-pickup-motion mt-3" aria-hidden>
      <div className="shimai-pickup-track">
        <span className="shimai-pickup-endpoint shimai-pickup-endpoint--start" />
        <span className="shimai-pickup-dot" />
        <span className="shimai-pickup-endpoint shimai-pickup-endpoint--end" />
      </div>
      <span className="font-sans text-xs tracking-wide text-shimai-gold/75">
        Va por tu pedido
      </span>
    </div>
  );
}

/** Active delivery — gold repartidor dot en route to sakura destination. */
function TransitMotion() {
  return (
    <div className="shimai-transit-motion mt-3" aria-hidden>
      <div className="shimai-transit-track">
        <span className="shimai-transit-endpoint shimai-transit-endpoint--start" />
        <span className="shimai-transit-trail" />
        <span className="shimai-transit-dot" />
        <span className="shimai-transit-endpoint shimai-transit-endpoint--end" />
      </div>
      <span className="font-sans text-xs tracking-wide text-shimai-gold/75">
        En movimiento hacia ti
      </span>
    </div>
  );
}

export function TrackerClient({
  orderId,
  initialStatus,
  customer,
  initialDriver,
  driverName,
}: TrackerClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [driver, setDriver] = useState(initialDriver);
  const [displayDriverName, setDisplayDriverName] = useState(driverName);
  const [redirectIn, setRedirectIn] = useState<number | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useLiveRefresh({
    table: "notifications",
    filter: `order_id=eq.${orderId}`,
    pollMs: 3000,
    enabled: status !== "delivered" && status !== "cancelled",
  });

  useEffect(() => {
    setDisplayDriverName(driverName);
  }, [driverName]);

  // After delivery: show message, then send customer back to SHIMAI home
  useEffect(() => {
    if (status !== "delivered") {
      setRedirectIn(null);
      return;
    }

    setRedirectIn(6);
    const tick = window.setInterval(() => {
      setRedirectIn((n) => {
        if (n == null || n <= 0) return n;
        return n - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status !== "delivered" || redirectIn !== 0) return;
    router.replace("/");
  }, [status, redirectIn, router]);

  useEffect(() => {
    if (displayDriverName) return;

    const shouldLoadName =
      status === "in_transit" ||
      status === "delivered" ||
      driver != null ||
      status === "ready_for_pickup";

    if (!shouldLoadName) return;

    let cancelled = false;

    void supabase
      .rpc("get_public_tracker", { p_order_id: orderId })
      .then(({ data, error }) => {
        if (cancelled || error || !data || typeof data !== "object") return;

        const name = (data as { driver_name?: unknown }).driver_name;
        if (typeof name === "string" && name.trim()) {
          setDisplayDriverName(name.trim());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayDriverName, driver, orderId, status, supabase]);

  const driverLine = driverStatusLine({
    status,
    driverName: displayDriverName,
    hasDriverPin: driver != null,
  });

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
    <div className="flex h-dvh flex-col overflow-hidden bg-shimai-black text-shimai-ivory">
      <header className="shrink-0 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-lg tracking-wide text-shimai-ivory">
            SHIMAI
          </p>
          <ClientNotificationCenter orderId={orderId} />
        </div>
      </header>

      <div className="min-h-0 flex-[0.7]">
        <TrackerMap customer={customer} driver={driver} />
      </div>

      <div className="flex-[0.3] overflow-y-auto border-t border-white/[0.08] bg-shimai-black px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        {status !== "delivered" && status !== "cancelled" ? (
          <div className="mx-auto mb-3 max-w-lg">
            <PushPermissionBanner
              audience="client"
              orderId={orderId}
              title="Avisos de tu pedido"
              description="Te avisamos cuando salga de cocina, vaya en camino o el repartidor esté cerca."
            />
          </div>
        ) : null}
        <div className="mx-auto max-w-lg rounded-md border border-shimai-gold/25 bg-shimai-surface/70 p-4">
          <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-gold">
            Estado
          </p>
          <p className="mt-2 font-serif text-xl text-shimai-ivory sm:text-2xl">
            {statusCopy(status)}
          </p>
          {status === "preparing" ? <PreparingMotion /> : null}
          {status === "ready_for_pickup" ? <PickupMotion /> : null}
          {status === "in_transit" ? <TransitMotion /> : null}
          {driverLine ? (
            <p className="mt-2 font-sans text-sm text-shimai-ivory/55">
              {driverLine}
            </p>
          ) : null}
          {status === "in_transit" ? (
            <p className="mt-3 font-sans text-xs text-shimai-gold/80">
              Pin moto dorado = repartidor · pin casa sakura = tu dirección
            </p>
          ) : null}
          {status === "delivered" ? (
            <div className="mt-4 space-y-3">
              <p className="font-sans text-sm text-shimai-ivory/70">
                ¡Gracias por pedir en SHIMAI!
              </p>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center border border-shimai-gold bg-shimai-gold px-4 font-sans text-sm font-medium text-shimai-black"
              >
                Volver a SHIMAI
              </Link>
              {redirectIn != null && redirectIn > 0 ? (
                <p className="font-sans text-[11px] text-shimai-ivory/45">
                  Te llevamos al inicio en {redirectIn}s…
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
