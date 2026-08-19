"use server";

import { revalidatePath } from "next/cache";

import { requireDriverClient } from "@/lib/driver/require-driver";
import { notifyOrderInTransit } from "@/lib/driver/notify-in-transit";
import { isInMexicoBounds } from "@/lib/delivery/mexico-bounds";
import type { OrderStatus } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function claimOrder(orderId: string): Promise<ActionResult> {
  const gate = await requireDriverClient();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: order, error: fetchError } = await gate.supabase
    .from("orders")
    .select("id, status, driver_id")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.status !== "ready_for_pickup") {
    return { ok: false, error: "El pedido no está listo para recoger." };
  }
  if (order.driver_id && order.driver_id !== gate.driverId) {
    return { ok: false, error: "Pedido ya asignado a otro repartidor." };
  }

  const { error } = await gate.supabase
    .from("orders")
    .update({ driver_id: gate.driverId })
    .eq("id", orderId)
    .eq("status", "ready_for_pickup");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/driver");
  revalidatePath(`/driver/orders/${orderId}`);
  return { ok: true };
}

export async function startDelivery(orderId: string): Promise<ActionResult> {
  const gate = await requireDriverClient();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: order, error: fetchError } = await gate.supabase
    .from("orders")
    .select("id, status, driver_id, client_phone")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.driver_id !== gate.driverId) {
    return { ok: false, error: "Pedido no asignado a ti." };
  }
  if (order.status !== "ready_for_pickup") {
    return { ok: false, error: "Solo puedes iniciar desde 'Listo'." };
  }

  const nextStatus: OrderStatus = "in_transit";
  const { error } = await gate.supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId)
    .eq("driver_id", gate.driverId);

  if (error) return { ok: false, error: error.message };

  // Fire-and-forget WhatsApp (Twilio); never block delivery flow
  void notifyOrderInTransit({
    orderId,
    clientPhone: order.client_phone,
  });

  revalidatePath("/driver");
  revalidatePath(`/driver/orders/${orderId}`);
  revalidatePath(`/tracker/${orderId}`);
  return { ok: true };
}

export async function markDelivered(orderId: string): Promise<ActionResult> {
  const gate = await requireDriverClient();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: order, error: fetchError } = await gate.supabase
    .from("orders")
    .select("id, status, driver_id")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.driver_id !== gate.driverId) {
    return { ok: false, error: "Pedido no asignado a ti." };
  }
  if (order.status !== "in_transit") {
    return { ok: false, error: "El pedido no está en camino." };
  }

  const { error } = await gate.supabase
    .from("orders")
    .update({ status: "delivered" satisfies OrderStatus })
    .eq("id", orderId)
    .eq("driver_id", gate.driverId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/driver");
  revalidatePath(`/driver/orders/${orderId}`);
  revalidatePath(`/tracker/${orderId}`);
  return { ok: true };
}

export async function upsertDriverLocation(input: {
  orderId: string;
  lat: number;
  lng: number;
}): Promise<ActionResult> {
  const gate = await requireDriverClient();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return { ok: false, error: "Coordenadas inválidas." };
  }

  if (!isInMexicoBounds(input.lat, input.lng)) {
    return {
      ok: false,
      error: "Ubicación fuera de México; no se guardó.",
    };
  }

  const { data: order } = await gate.supabase
    .from("orders")
    .select("id, status, driver_id")
    .eq("id", input.orderId)
    .maybeSingle();

  if (!order || order.driver_id !== gate.driverId) {
    return { ok: false, error: "Pedido no asignado." };
  }
  if (order.status !== "in_transit") {
    return { ok: false, error: "GPS solo activo en tránsito." };
  }

  const { error } = await gate.supabase.from("driver_locations").upsert(
    {
      order_id: input.orderId,
      driver_id: gate.driverId,
      lat: input.lat,
      lng: input.lng,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
