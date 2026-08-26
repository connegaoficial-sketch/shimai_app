"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/require-admin";
import { assignDriverToOrder } from "@/lib/driver/assign-driver";
import {
  copyDriverAssigned,
  copyForOrderStatus,
} from "@/lib/notifications/events";
import { notifyClient, notifyDriver } from "@/lib/notifications/dispatch";
import type { OrderStatus } from "@/types/database";

const ALLOWED_STATUS: ReadonlySet<OrderStatus> = new Set([
  "pending_payment",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
  "cancelled",
]);

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  if (!ALLOWED_STATUS.has(status)) {
    return { ok: false, error: "Estado inválido." };
  }

  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { error } = await gate.supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const clientCopy = copyForOrderStatus(status, orderId);
  if (clientCopy) {
    await notifyClient({ supabase: gate.supabase, payload: clientCopy });
    revalidatePath(`/tracker/${orderId}`);
  }

  if (status === "ready_for_pickup") {
    const { data: orderRow } = await gate.supabase
      .from("orders")
      .select("id, total, driver_id")
      .eq("id", orderId)
      .maybeSingle();

    const assignment = await assignDriverToOrder(gate.supabase, orderId);

    if (assignment.assigned && assignment.driverId && orderRow) {
      const totalMxn = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }).format(Number(orderRow.total));

      await notifyDriver({
        supabase: gate.supabase,
        driverId: assignment.driverId,
        payload: copyDriverAssigned(orderId, totalMxn),
      });
      revalidatePath("/driver");
      revalidatePath(`/driver/orders/${orderId}`);
    }
  }

  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function validateBankTransferPayment(
  orderId: string,
): Promise<ActionResult> {
  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { data: order, error: fetchError } = await gate.supabase
    .from("orders")
    .select("id, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!order) {
    return { ok: false, error: "Pedido no encontrado." };
  }
  if (order.payment_method !== "bank_transfer") {
    return { ok: false, error: "El pedido no es transferencia." };
  }
  if (order.payment_status !== "awaiting_proof") {
    return { ok: false, error: "No hay comprobante pendiente." };
  }

  const { error } = await gate.supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
    })
    .eq("id", orderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/orders");
  return { ok: true };
}
