"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  updateOrderStatus,
  validateBankTransferPayment,
} from "@/app/(admin)/admin/(panel)/orders/actions";
import { Button } from "@/components/ui/button";
import {
  NEXT_STATUS_ACTION,
  ORDER_STATUS_COLUMNS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatOrderTime,
} from "@/lib/admin/labels";
import {
  canValidateBankTransfer,
  clientDisplayName,
  type AdminOrder,
} from "@/lib/admin/order-types";
import { formatMxn } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

type OrdersKanbanProps = {
  orders: AdminOrder[];
};

export function OrdersKanban({ orders }: OrdersKanbanProps) {
  const columns = ORDER_STATUS_COLUMNS.map((status) => ({
    status,
    orders: orders.filter((o) => o.status === status),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl text-shimai-ivory">Pedidos</h1>
        <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
          Tablero de cocina · {orders.length} recientes
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((column) => (
          <section
            key={column.status}
            className="flex w-72 shrink-0 flex-col rounded-md border border-white/[0.08] bg-shimai-surface/40"
          >
            <header className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
              <h2 className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-shimai-gold">
                {ORDER_STATUS_LABELS[column.status]}
              </h2>
              <span className="font-sans text-xs text-shimai-ivory/40">
                {column.orders.length}
              </span>
            </header>
            <div className="flex max-h-[calc(100dvh-14rem)] flex-col gap-2 overflow-y-auto p-2">
              {column.orders.length === 0 ? (
                <p className="px-2 py-6 text-center font-sans text-xs text-shimai-ivory/30">
                  Vacío
                </p>
              ) : (
                column.orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATUS_ACTION[order.status];
  const showValidate = canValidateBankTransfer(order);
  const canCancel =
    order.status !== "delivered" && order.status !== "cancelled";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <article
      className={cn(
        "rounded-md border border-white/[0.08] bg-shimai-black p-3",
        pending && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-sans text-sm font-medium text-shimai-ivory">
            {clientDisplayName(order)}
          </p>
          <p className="mt-0.5 font-sans text-[11px] text-shimai-ivory/45">
            {formatOrderTime(order.created_at)}
          </p>
        </div>
        <p className="font-sans text-sm text-shimai-gold">
          {formatMxn(Number(order.total))}
        </p>
      </div>

      <dl className="mt-3 space-y-1 font-sans text-[11px] text-shimai-ivory/55">
        <div className="flex justify-between gap-2">
          <dt>Pago</dt>
          <dd className="text-right text-shimai-ivory/80">
            {PAYMENT_METHOD_LABELS[order.payment_method]}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Estado pago</dt>
          <dd className="text-right text-shimai-ivory/80">
            {PAYMENT_STATUS_LABELS[order.payment_status]}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Ítems</dt>
          <dd className="text-right text-shimai-ivory/80">
            {order.order_items.reduce((sum, i) => sum + i.quantity, 0)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-col gap-1.5">
        {showValidate ? (
          <Button
            size="sm"
            variant="sakura"
            disabled={pending}
            onClick={() =>
              run(() => validateBankTransferPayment(order.id))
            }
          >
            Validar Pago
          </Button>
        ) : null}
        {next ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() => updateOrderStatus(order.id, next.status))
            }
          >
            {next.label}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() =>
                updateOrderStatus(order.id, "cancelled" satisfies OrderStatus),
              )
            }
          >
            Cancelar
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 font-sans text-[11px] text-seal-red">{error}</p>
      ) : null}
    </article>
  );
}
