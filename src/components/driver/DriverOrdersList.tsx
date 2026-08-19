"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { claimOrder } from "@/app/(driver)/driver/(panel)/actions";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS } from "@/lib/admin/labels";
import { formatMxn } from "@/lib/format";
import type { Order, PaymentMethod } from "@/types/database";

export type DriverOrderCard = Pick<
  Order,
  | "id"
  | "status"
  | "payment_method"
  | "payment_status"
  | "total"
  | "client_phone"
  | "delivery_address"
  | "driver_id"
  | "created_at"
>;

export function DriverOrdersList({
  assigned,
  available,
}: {
  assigned: DriverOrderCard[];
  available: DriverOrderCard[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="font-serif text-2xl text-shimai-ivory">Mis pedidos</h1>
        {assigned.length === 0 ? (
          <p className="font-sans text-sm text-shimai-ivory/45">
            No tienes pedidos asignados.
          </p>
        ) : (
          assigned.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-gold">
          Listos sin asignar
        </h2>
        {available.length === 0 ? (
          <p className="font-sans text-sm text-shimai-ivory/45">
            Nada disponible por ahora.
          </p>
        ) : (
          available.map((order) => (
            <AvailableRow key={order.id} order={order} />
          ))
        )}
      </section>
    </div>
  );
}

function OrderRow({ order }: { order: DriverOrderCard }) {
  const address = addressText(order.delivery_address);
  return (
    <Link
      href={`/driver/orders/${order.id}`}
      className="block rounded-md border border-shimai-gold/25 bg-shimai-surface/60 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-sm font-medium text-shimai-ivory">
            {statusLabel(order.status)}
          </p>
          <p className="mt-1 font-sans text-xs text-shimai-ivory/55">
            {address}
          </p>
        </div>
        <p className="font-sans text-sm text-shimai-gold">
          {formatMxn(Number(order.total))}
        </p>
      </div>
      <p className="mt-3 font-sans text-xs text-shimai-ivory/45">
        {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
      </p>
    </Link>
  );
}

function AvailableRow({ order }: { order: DriverOrderCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const address = addressText(order.delivery_address);

  return (
    <div className="rounded-md border border-white/[0.08] bg-shimai-black p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-sm text-shimai-ivory">{address}</p>
          <p className="mt-1 font-sans text-xs text-shimai-ivory/45">
            {formatMxn(Number(order.total))} ·{" "}
            {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
          </p>
        </div>
      </div>
      <Button
        className="mt-4 h-14 w-full text-base"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await claimOrder(order.id);
            if (result.ok) {
              router.push(`/driver/orders/${order.id}`);
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Tomando…" : "Tomar pedido"}
      </Button>
    </div>
  );
}

function addressText(value: Order["delivery_address"]): string {
  if (!value || typeof value !== "object") return "Sin dirección";
  const row = value as Record<string, unknown>;
  if (typeof row.text === "string" && row.text.trim()) return row.text;
  return "Sin dirección";
}

function statusLabel(status: Order["status"]): string {
  switch (status) {
    case "ready_for_pickup":
      return "Listo para recoger";
    case "in_transit":
      return "En camino";
    default:
      return status;
  }
}
