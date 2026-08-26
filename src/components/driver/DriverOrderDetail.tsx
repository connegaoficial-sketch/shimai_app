"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  markDelivered,
  markOrderPaid,
  startDelivery,
} from "@/app/(driver)/driver/(panel)/actions";
import { SlideToConfirm } from "@/components/driver/SlideToConfirm";
import { useDriverGpsPush } from "@/hooks/useDriverGpsPush";
import { PAYMENT_METHOD_LABELS } from "@/lib/admin/labels";
import { formatMxn } from "@/lib/format";
import type { Order, OrderItem, PaymentMethod, PaymentStatus } from "@/types/database";

type DriverOrderDetailProps = {
  order: Order;
  items: Array<
    Pick<OrderItem, "id" | "quantity" | "unit_price" | "product_id"> & {
      products: { name: string } | null;
    }
  >;
  trackerUrl: string;
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

  const gpsActive = status === "in_transit";
  const gpsWarning = useDriverGpsPush({ orderId: order.id, active: gpsActive });

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
        <div className="space-y-2">
          <p className="rounded-md border border-shimai-gold/30 bg-shimai-gold/10 px-3 py-3 font-sans text-sm text-shimai-gold">
            GPS activo — compartiendo ubicación cada 5s
          </p>
          {gpsWarning ? (
            <p
              className="rounded-md border border-seal-red/40 bg-seal-red/10 px-3 py-3 font-sans text-sm text-seal-red"
              role="alert"
            >
              {gpsWarning}
            </p>
          ) : null}
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
              const result = await run(() => startDelivery(order.id));
              if (result.ok) setStatus("in_transit");
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

        {status === "in_transit" &&
        (!collectOnDelivery || isPaid) ? (
          <SlideToConfirm
            label="Desliza para confirmar entrega"
            completedLabel="Entrega completada"
            pending={pending}
            variant="sakura"
            onConfirm={async () => {
              const result = await run(() => markDelivered(order.id));
              if (result.ok) setStatus("delivered");
              if (!result.ok) throw new Error(result.error);
            }}
          />
        ) : null}

        {status === "delivered" ? (
          <p className="text-center font-sans text-sm text-shimai-gold">
            Entrega completada
          </p>
        ) : null}
      </div>
    </div>
  );
}
