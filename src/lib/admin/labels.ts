import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";

export const ORDER_STATUS_COLUMNS: readonly OrderStatus[] = [
  "pending_payment",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pago pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready_for_pickup: "Listo",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card_online: "Tarjeta online",
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card_terminal: "Terminal",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  awaiting_proof: "Esperando comprobante",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

export type StatusAction = {
  status: OrderStatus;
  label: string;
};

/** Primary forward transition for kitchen flow. */
export const NEXT_STATUS_ACTION: Partial<Record<OrderStatus, StatusAction>> = {
  confirmed: { status: "preparing", label: "Marcar como Preparando" },
  preparing: { status: "ready_for_pickup", label: "Listo para despachar" },
  ready_for_pickup: { status: "in_transit", label: "En camino" },
  in_transit: { status: "delivered", label: "Entregado" },
};

export function formatOrderTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
