"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  markDelivered,
  markOrderPaid,
  startDelivery,
} from "@/app/(driver)/driver/(panel)/actions";
import { SlideToConfirm } from "@/components/driver/SlideToConfirm";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS } from "@/lib/admin/labels";
import { formatMxn } from "@/lib/format";
import { openGoogleMapsDirections } from "@/lib/maps/google-directions";
import type { Order, OrderItem, PaymentMethod, PaymentStatus } from "@/types/database";

const REQUEST_GPS_EVENT = "shimai:request-gps";

type DriverOrderDetailProps = {
  order: Order;
  items: Array<
    Pick<OrderItem, "id" | "quantity" | "unit_price" | "product_id"> & {
      products: { name: string } | null;
    }
  >;
  trackerUrl: string;
};

type GpsPulse = {
  lat: number;
  lng: number;
  at: number;
};

export function DriverOrderDetail({
  order,
  items,
  trackerUrl,
}: DriverOrderDetailProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.payment_status,
  );
  const [gpsPulse, setGpsPulse] = useState<GpsPulse | null>(null);
  const [openingRoute, setOpeningRoute] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const gpsActive = status === "in_transit";
  const destLat = order.delivery_lat;
  const destLng = order.delivery_lng;
  const hasDestination =
    typeof destLat === "number" &&
    typeof destLng === "number" &&
    Number.isFinite(destLat) &&
    Number.isFinite(destLng);

  const collectOnDelivery =
    order.payment_method === "cash" ||
    order.payment_method === "card_terminal";
  const needsCollection =
    collectOnDelivery && paymentStatus === "pending" && status === "in_transit";
  const isPaid = paymentStatus === "paid";

  const address =
    order.delivery_address &&
    typeof order.delivery_address === "object" &&
    typeof (order.delivery_address as { text?: unknown }).text === "string"
      ? String((order.delivery_address as { text: string }).text)
      : "Sin dirección";

  useEffect(() => {
    function onGpsFix(event: Event) {
      const detail = (event as CustomEvent<GpsPulse & { orderId?: string }>)
        .detail;
      if (!detail || detail.orderId !== order.id) return;
      setGpsPulse({
        lat: detail.lat,
        lng: detail.lng,
        at: detail.at,
      });
    }
    window.addEventListener("shimai:gps-fix", onGpsFix);
    return () => window.removeEventListener("shimai:gps-fix", onGpsFix);
  }, [order.id]);

  useEffect(() => {
    if (!gpsActive) return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [gpsActive]);

  const gpsAgeSec = gpsPulse
    ? Math.max(0, Math.round((nowTick - gpsPulse.at) / 1000))
    : null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (!result.ok) {
          setError(result.error ?? "Error");
        } else {
          router.refresh();
        }
        resolve(result);
      });
    });
  }

  function openRoute() {
    if (!hasDestination) {
      setError("Este pedido no tiene coordenadas de entrega.");
      return;
    }

    setOpeningRoute(true);
    setError(null);

    const openWith = (originLat?: number, originLng?: number) => {
      openGoogleMapsDirections({
        destinationLat: destLat!,
        destinationLng: destLng!,
        originLat,
        originLng,
      });
      setOpeningRoute(false);
    };

    // Prefer live GPS for origin; if unavailable, Google Maps uses device location
    if (!("geolocation" in navigator)) {
      openWith(gpsPulse?.lat, gpsPulse?.lng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => openWith(pos.coords.latitude, pos.coords.longitude),
      () => openWith(gpsPulse?.lat, gpsPulse?.lng),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <Link
        href="/driver"
        className="inline-block font-sans text-sm text-shimai-gold"
      >
        ← Pedidos
      </Link>

      <div>
        <h1 className="font-serif text-3xl text-shimai-ivory">Entrega</h1>
        <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
          {formatMxn(Number(order.total))} ·{" "}
          {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
        </p>
      </div>

      {collectOnDelivery ? (
        <div
          className="border-2 border-shimai-gold bg-shimai-gold px-4 py-4 text-center"
          role="status"
        >
          <p className="font-sans text-lg font-bold tracking-wide text-shimai-black">
            COBRAR AL ENTREGAR
          </p>
          <p className="mt-1 font-sans text-sm text-shimai-black/80">
            {order.payment_method === "cash"
              ? `Efectivo · ${formatMxn(Number(order.total))}`
              : `Terminal · ${formatMxn(Number(order.total))}`}
          </p>
          {isPaid ? (
            <p className="mt-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-shimai-black/70">
              Pago confirmado
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-md border border-white/[0.08] p-4">
        <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-shimai-ivory/45">
          Dirección
        </p>
        <p className="mt-2 font-sans text-base text-shimai-ivory">{address}</p>
        {order.client_phone ? (
          <a
            href={`tel:${order.client_phone}`}
            className="mt-3 inline-flex h-12 items-center font-sans text-sm text-shimai-gold"
          >
            Llamar {order.client_phone}
          </a>
        ) : null}
        {order.delivery_notes ? (
          <p className="mt-3 font-sans text-sm text-shimai-ivory/60">
            Notas: {order.delivery_notes}
          </p>
        ) : null}

        {hasDestination ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            disabled={openingRoute}
            onClick={openRoute}
          >
            {openingRoute ? "Abriendo ruta…" : "Abrir ruta en Google Maps"}
          </Button>
        ) : (
          <p className="mt-3 font-sans text-xs text-shimai-ivory/45">
            Sin pin de destino — no se puede abrir la ruta.
          </p>
        )}
      </section>

      <section className="rounded-md border border-white/[0.08] p-4">
        <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-shimai-ivory/45">
          Ítems
        </p>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-3 font-sans text-sm"
            >
              <span className="text-shimai-ivory">
                {item.quantity}× {item.products?.name ?? "Producto"}
              </span>
              <span className="text-shimai-ivory/50">
                {formatMxn(Number(item.unit_price) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {gpsActive ? (
        <div className="rounded-md border border-shimai-gold/30 bg-shimai-gold/10 px-3 py-3">
          <p className="font-sans text-sm text-shimai-gold">
            GPS compartiendo ubicación con el cliente
          </p>
          <p className="mt-1 font-sans text-xs text-shimai-ivory/65">
            {gpsPulse
              ? `Último envío hace ${gpsAgeSec}s · ${gpsPulse.lat.toFixed(5)}, ${gpsPulse.lng.toFixed(5)}`
              : "Esperando primer fix… Activa ubicación arriba si aún no lo pediste."}
          </p>
        </div>
      ) : null}

      <p className="break-all font-sans text-[11px] text-shimai-ivory/35">
        Tracker cliente: {trackerUrl}
      </p>

      {error ? (
        <p className="font-sans text-sm text-seal-red" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3 pt-2">
        {status === "ready_for_pickup" ? (
          <SlideToConfirm
            label="Desliza para iniciar entrega"
            completedLabel="Entrega iniciada"
            pending={pending}
            variant="gold"
            onConfirm={async () => {
              window.dispatchEvent(new Event(REQUEST_GPS_EVENT));
              const result = await run(() => startDelivery(order.id));
              if (result.ok) {
                setStatus("in_transit");
                // Open navigation right after starting delivery
                if (hasDestination) {
                  window.setTimeout(() => openRoute(), 400);
                }
              }
              if (!result.ok) throw new Error(result.error);
            }}
          />
        ) : null}

        {status === "in_transit" && needsCollection ? (
          <SlideToConfirm
            label={
              order.payment_method === "cash"
                ? "Desliza para confirmar pago en efectivo"
                : "Desliza para confirmar pago con terminal"
            }
            completedLabel="Pago confirmado"
            pending={pending}
            variant="gold"
            completed={isPaid}
            onConfirm={async () => {
              const result = await run(() => markOrderPaid(order.id));
              if (result.ok) setPaymentStatus("paid");
              if (!result.ok) throw new Error(result.error);
            }}
          />
        ) : null}

        {status === "in_transit" && (!collectOnDelivery || isPaid) ? (
          <SlideToConfirm
            label="Desliza para confirmar entrega"
            completedLabel="Entrega completada"
            pending={pending}
            variant="sakura"
            onConfirm={async () => {
              const result = await run(() => markDelivered(order.id));
              if (!result.ok) throw new Error(result.error);
              setStatus("delivered");
              window.setTimeout(() => {
                router.replace("/driver");
                router.refresh();
              }, 900);
            }}
          />
        ) : null}

        {status === "delivered" ? (
          <p className="text-center font-sans text-sm text-shimai-gold">
            Entrega completada — volviendo a pedidos…
          </p>
        ) : null}
      </div>
    </div>
  );
}
