"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/require-admin";
import type { Json } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updatePromosSetting(
  value: Json,
): Promise<ActionResult> {
  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { error } = await gate.supabase
    .from("settings")
    .update({ value })
    .eq("key", "promos");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/promos");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/confirmation");
  return { ok: true };
}
