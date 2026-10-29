"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  updateOrderStatus,
  validateBankTransferPayment,
} from "@/app/(admin)/admin/(panel)/orders/actions";
import { Button } from "@/components/ui/button";
import type { NewOrderAlert } from "@/hooks/useAdminOrderAlerts";
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

export type OrdersKanbanProps = {
  orders: AdminOrder[];
  alert?: NewOrderAlert | null;
  onDismissAlert?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onTestChime?: () => void;
  pushSubscribed?: boolean;
  pushPermission?: NotificationPermission;
  onEnablePush?: () => Promise<boolean>;
  onTestPush?: () => Promise<{ ok: boolean; sent?: number; failed?: number }>;
};

function formatDeliveryAddress(address: unknown): string | null {
  if (!address) return null;
  if (typeof address === "string") return address.trim();
  if (typeof address === "object") {
    const addr = address as Record<string, unknown>;
    if (typeof addr.text === "string" && addr.text.trim()) {
      return addr.text.trim();
    }
    const parts = [addr.street, addr.colony, addr.city].filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
    if (parts.length > 0) return parts.join(", ");
  }
  return null;
}

export function OrdersKanban({
  orders,
  alert,
  onDismissAlert,
  soundEnabled = true,
  onToggleSound,
  onTestChime,
  pushSubscribed = false,
  pushPermission = "default",
  onEnablePush,
  onTestPush,
}: OrdersKanbanProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushMessage, setTestPushMessage] = useState<string | null>(null);

  async function handleTestPush() {
    if (!onTestPush) return;
    setTestPushLoading(true);
    setTestPushMessage(null);
    try {
      const res = await onTestPush();
      if (res.ok) {
        setTestPushMessage(
          "✓ Notificación enviada. Bloquea tu pantalla o minimiza la app para verla.",
        );
      } else {
        setTestPushMessage(
          "No hay dispositivos suscritos. Pulsa 'Activar Push' primero.",
        );
      }
    } catch {
      setTestPushMessage("Error al enviar prueba.");
    } finally {
      setTestPushLoading(false);
      window.setTimeout(() => setTestPushMessage(null), 8000);
    }
  }

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const columns = ORDER_STATUS_COLUMNS.map((status) => ({
    status,
    orders: orders.filter((o) => o.status === status),
  }));

  return (
    <div className="space-y-4">
      {/* Alert Banner for New Incoming Order */}
      {alert ? (
        <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-lg border border-shimai-gold/50 bg-gradient-to-r from-shimai-surface via-shimai-black to-shimai-surface p-4 text-shimai-ivory shadow-xl shadow-black/80 ring-1 ring-shimai-gold/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-shimai-gold/20 text-2xl text-shimai-gold border border-shimai-gold/40 animate-bounce">
              🔔
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-shimai-gold">
                  ¡Nuevo Pedido en Cocina!
                </span>
                <span className="font-mono text-xs text-shimai-ivory/60">
                  #{alert.orderId.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <p className="mt-0.5 font-sans text-sm text-shimai-ivory">
                <strong className="text-white font-medium">
                  {alert.clientName}
                </strong>{" "}
                ·{" "}
                <span className="text-shimai-gold font-semibold">
                  {formatMxn(alert.total)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedOrderId(alert.orderId);
                onDismissAlert?.();
              }}
              className="bg-shimai-gold text-shimai-black hover:bg-shimai-gold/90 font-semibold shadow-md"
            >
              Ver platillos del pedido →
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDismissAlert}
              className="border-white/[0.15] text-shimai-ivory/70 hover:text-shimai-ivory"
            >
              Descartar
            </Button>
          </div>
        </div>
      ) : null}

      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl text-shimai-ivory">Pedidos</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-sans text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En vivo · Auto 5s
            </span>
          </div>
          <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
            Tablero de cocina · {orders.length} recientes · Actualización automática sin recargar la página
          </p>
        </div>

        {/* Audio & Notification Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onToggleSound ? (
            <button
              type="button"
              onClick={onToggleSound}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-sans text-xs transition-colors",
                soundEnabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-white/[0.1] bg-white/[0.04] text-shimai-ivory/50 hover:bg-white/[0.08]",
              )}
              title={
                soundEnabled
                  ? "Timbre de cocina activado (clic para silenciar)"
                  : "Timbre silenciado (clic para activar)"
              }
            >
              <span>{soundEnabled ? "🔔" : "🔕"}</span>
              <span className="font-medium">
                {soundEnabled ? "Timbre activo" : "Silenciado"}
              </span>
            </button>
          ) : null}

          {onTestChime ? (
            <button
              type="button"
              onClick={onTestChime}
              className="flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 font-sans text-xs text-shimai-ivory/70 hover:bg-white/[0.08] hover:text-shimai-ivory transition-colors"
              title="Probar sonido y desbloquear audio en este navegador"
            >
              <span>🔊</span>
              <span>Probar</span>
            </button>
          ) : null}

          {onEnablePush && !pushSubscribed ? (
            <button
              type="button"
              onClick={() => void onEnablePush()}
              className="flex items-center gap-1.5 rounded-md border border-shimai-gold bg-shimai-gold px-2.5 py-1.5 font-sans text-xs font-semibold text-shimai-black hover:bg-shimai-gold/90 transition-colors shadow-sm"
              title="Activar notificaciones push para recibir pedidos con la pantalla bloqueada"
            >
              <span>📲</span>
              <span>Activar Push en Celular</span>
            </button>
          ) : pushSubscribed ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/25">
                <span>✓</span> Push celular activo
              </span>
              {onTestPush ? (
                <button
                  type="button"
                  onClick={() => void handleTestPush()}
                  disabled={testPushLoading}
                  className="flex items-center gap-1 rounded-md border border-white/[0.12] bg-white/[0.04] px-2 py-1 font-sans text-[11px] text-shimai-ivory/80 hover:bg-white/[0.08] hover:text-white transition-colors"
                  title="Enviar una notificación push real a este teléfono para probar la pantalla bloqueada"
                >
                  <span>{testPushLoading ? "Enviando…" : "📲 Probar Push"}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Push status alert toast message */}
      {testPushMessage ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-sans text-xs text-emerald-300 animate-in fade-in">
          {testPushMessage}
        </div>
      ) : null}

      {/* Callout if push is not enabled */}
      {!pushSubscribed && pushPermission !== "granted" && onEnablePush ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-shimai-gold/40 bg-shimai-gold/10 p-3.5 text-xs text-shimai-ivory">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📲</span>
            <div>
              <p className="font-semibold text-shimai-gold text-sm">
                Recibe avisos de pedidos con la pantalla bloqueada
              </p>
              <p className="text-xs text-shimai-ivory/70 mt-0.5">
                Para que tu teléfono vibre y te avise aunque tengas la app cerrada o el teléfono en el bolsillo, activa las notificaciones push.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => void onEnablePush()}
            className="bg-shimai-gold text-shimai-black hover:bg-shimai-gold/90 font-semibold"
          >
            Activar Notificaciones Push
          </Button>
        </div>
      ) : null}

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-4 [-webkit-overflow-scrolling:touch]">
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
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOpenDetails={() => setSelectedOrderId(order.id)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {selectedOrder ? (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
        />
      ) : null}
    </div>
  );
}

function OrderCard({
  order,
  onOpenDetails,
}: {
  order: AdminOrder;
  onOpenDetails: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATUS_ACTION[order.status];
  const showValidate = canValidateBankTransfer(order);
  const canCancel =
    order.status !== "delivered" && order.status !== "cancelled";

  const totalItems = order.order_items.reduce(
    (sum, i) => sum + i.quantity,
    0,
  );

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
      onClick={onOpenDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-md border border-white/[0.08] bg-shimai-black p-3 text-left transition-all duration-150 hover:border-shimai-gold/40 hover:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-shimai-gold/60",
        pending && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-sans text-sm font-medium text-shimai-ivory group-hover:text-shimai-gold transition-colors">
            {clientDisplayName(order)}
          </p>
          <p className="mt-0.5 font-sans text-[11px] text-shimai-ivory/45">
            {formatOrderTime(order.created_at)}
          </p>
        </div>
        <p className="font-sans text-sm font-semibold text-shimai-gold">
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
          <dt>Platillos</dt>
          <dd className="text-right font-medium text-shimai-gold">
            {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
          </dd>
        </div>
      </dl>

      {/* Preview list of products */}
      {order.order_items.length > 0 ? (
        <div className="mt-2.5 rounded border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 font-sans text-[11px] text-shimai-ivory/70">
          <ul className="space-y-0.5">
            {order.order_items.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 truncate"
              >
                <span className="truncate">
                  <span className="font-semibold text-shimai-gold/90">
                    {item.quantity}×
                  </span>{" "}
                  {item.products?.name ?? "Platillo"}
                </span>
                <span className="shrink-0 text-[10px] text-shimai-ivory/40">
                  {formatMxn(Number(item.unit_price) * item.quantity)}
                </span>
              </li>
            ))}
            {order.order_items.length > 3 ? (
              <li className="pt-0.5 text-center text-[10px] text-shimai-gold/70">
                +{order.order_items.length - 3} más...
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between text-[11px] text-shimai-gold/70 group-hover:text-shimai-gold transition-colors">
        <span>Ver pedido completo</span>
        <span>→</span>
      </div>

      <div
        className="mt-3 flex flex-col gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {showValidate ? (
          <Button
            size="sm"
            variant="sakura"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              run(() => validateBankTransferPayment(order.id));
            }}
          >
            Validar Pago
          </Button>
        ) : null}
        {next ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              run(() => updateOrderStatus(order.id, next.status));
            }}
          >
            {next.label}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              run(() =>
                updateOrderStatus(order.id, "cancelled" satisfies OrderStatus),
              );
            }}
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

function OrderDetailModal({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATUS_ACTION[order.status];
  const showValidate = canValidateBankTransfer(order);
  const canCancel =
    order.status !== "delivered" && order.status !== "cancelled";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Error al procesar acción");
        return;
      }
      router.refresh();
    });
  }

  const phone = order.client_phone || order.profiles?.phone;
  const addressText = formatDeliveryAddress(order.delivery_address);

  const itemsSubtotal = order.order_items.reduce(
    (sum, i) => sum + Number(i.unit_price) * i.quantity,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
    >
      <div
        className="relative flex max-h-[90dvh] w-full max-w-xl flex-col rounded-lg border border-white/[0.12] bg-shimai-black text-shimai-ivory shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] p-4 sm:p-5 bg-shimai-surface/60">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="order-detail-title"
                className="font-serif text-lg sm:text-xl font-bold tracking-wide text-shimai-gold"
              >
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </h2>
              <span className="rounded-full bg-shimai-gold/15 px-2.5 py-0.5 font-sans text-[11px] font-medium text-shimai-gold border border-shimai-gold/25">
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs text-shimai-ivory/50">
              Registrado el {formatOrderTime(order.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-md p-1.5 text-shimai-ivory/60 hover:bg-white/[0.08] hover:text-shimai-ivory transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Client & Delivery Info */}
          <section className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5 font-sans text-xs">
            <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-shimai-gold/80">
              Datos del Cliente y Entrega
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-shimai-ivory/80">
              <div>
                <span className="text-shimai-ivory/40">Cliente: </span>
                <span className="font-medium text-shimai-ivory">
                  {clientDisplayName(order)}
                </span>
              </div>
              {phone ? (
                <div>
                  <span className="text-shimai-ivory/40">Teléfono: </span>
                  <a
                    href={`tel:${phone}`}
                    className="font-medium text-shimai-gold hover:underline"
                  >
                    {phone}
                  </a>
                </div>
              ) : null}
            </div>

            {addressText ? (
              <div className="pt-1">
                <span className="text-shimai-ivory/40">Dirección: </span>
                <span className="text-shimai-ivory">{addressText}</span>
              </div>
            ) : (
              <div className="pt-1 text-shimai-ivory/40">
                Sin dirección registrada (para llevar / recoger)
              </div>
            )}

            {order.delivery_notes ? (
              <div className="mt-2 rounded border border-shimai-gold/30 bg-shimai-gold/10 p-2.5 text-shimai-ivory">
                <div className="font-semibold text-shimai-gold text-[11px] flex items-center gap-1.5 mb-0.5">
                  <span>📌</span> Indicaciones / Referencias de entrega:
                </div>
                <p className="text-xs text-shimai-ivory/90 whitespace-pre-wrap">
                  {order.delivery_notes}
                </p>
              </div>
            ) : null}
          </section>

          {/* Items breakdown */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-shimai-gold/80">
                Platillos ({order.order_items.length})
              </h3>
              <span className="font-sans text-xs text-shimai-ivory/50">
                Total ítems:{" "}
                {order.order_items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>

            <div className="divide-y divide-white/[0.06] rounded-md border border-white/[0.08] bg-white/[0.01]">
              {order.order_items.map((item) => {
                const product = item.products;
                const itemTotal = Number(item.unit_price) * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 text-xs"
                  >
                    {product?.image_url ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-white/[0.02]">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-white/[0.08] bg-white/[0.03] text-shimai-gold/40 text-lg">
                        🥢
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="rounded bg-shimai-gold/20 px-1.5 py-0.5 font-sans text-xs font-bold text-shimai-gold">
                            {item.quantity}×
                          </span>
                          <h4 className="font-sans font-medium text-shimai-ivory text-sm truncate">
                            {product?.name ?? "Platillo"}
                          </h4>
                        </div>
                        <span className="font-sans font-semibold text-shimai-gold shrink-0">
                          {formatMxn(itemTotal)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[11px] text-shimai-ivory/40">
                        {formatMxn(Number(item.unit_price))} cada uno
                      </p>

                      {product?.description ? (
                        <p className="mt-1 text-[11px] text-shimai-ivory/60 line-clamp-2">
                          {product.description}
                        </p>
                      ) : null}

                      {product?.is_sushi &&
                      (product.filling || product.topping) ? (
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-shimai-ivory/50">
                          {product.filling ? (
                            <span>
                              <strong className="text-shimai-gold/70">
                                Relleno:
                              </strong>{" "}
                              {product.filling}
                            </span>
                          ) : null}
                          {product.topping ? (
                            <span>
                              <strong className="text-shimai-gold/70">
                                Cobertura:
                              </strong>{" "}
                              {product.topping}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pricing & Payment Summary */}
          <section className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2 font-sans text-xs">
            <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-shimai-gold/80 mb-2">
              Resumen de Cuenta
            </h3>
            <div className="flex justify-between text-shimai-ivory/70">
              <span>Subtotal platillos</span>
              <span>{formatMxn(itemsSubtotal)}</span>
            </div>
            {Number(order.delivery_fee) > 0 ? (
              <div className="flex justify-between text-shimai-ivory/70">
                <span>Costo de envío</span>
                <span>{formatMxn(Number(order.delivery_fee))}</span>
              </div>
            ) : null}
            {Number(order.discount) > 0 ? (
              <div className="flex justify-between text-shimai-sakura">
                <span>
                  Descuento{" "}
                  {order.promo_code ? `(${order.promo_code})` : ""}
                </span>
                <span>-{formatMxn(Number(order.discount))}</span>
              </div>
            ) : null}
            <div className="border-t border-white/[0.08] pt-2 flex justify-between items-baseline text-sm font-semibold text-shimai-ivory">
              <span>Total a cobrar</span>
              <span className="text-base text-shimai-gold">
                {formatMxn(Number(order.total))}
              </span>
            </div>

            <div className="pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-shimai-ivory/40">Método de pago: </span>
                <span className="text-shimai-ivory font-medium">
                  {PAYMENT_METHOD_LABELS[order.payment_method]}
                </span>
              </div>
              <div className="text-right">
                <span className="text-shimai-ivory/40">Estado de pago: </span>
                <span className="text-shimai-ivory font-medium">
                  {PAYMENT_STATUS_LABELS[order.payment_status]}
                </span>
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded border border-seal-red/40 bg-seal-red/10 p-2.5 text-xs text-seal-red">
              {error}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] p-4 bg-shimai-surface/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            Cerrar
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {canCancel ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    updateOrderStatus(
                      order.id,
                      "cancelled" satisfies OrderStatus,
                    ),
                  )
                }
              >
                Cancelar pedido
              </Button>
            ) : null}

            {showValidate ? (
              <Button
                variant="sakura"
                size="sm"
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
          </div>
        </div>
      </div>
    </div>
  );
}
