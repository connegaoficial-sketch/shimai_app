"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/require-admin";
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
