"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/require-admin";
import type { Json } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateSetting(
  key: string,
  value: Json,
): Promise<ActionResult> {
  const allowed = new Set([
    "payment_methods",
    "bank_details",
    "delivery_config",
    "whatsapp_contact",
    "promos",
  ]);
  if (!allowed.has(key)) {
    return { ok: false, error: "Setting no permitido." };
  }

  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { error } = await gate.supabase
    .from("settings")
    .update({ value })
    .eq("key", key);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/confirmation");
  return { ok: true };
}
