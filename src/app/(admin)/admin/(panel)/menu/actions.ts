"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/require-admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ProductInput = {
  id?: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_available: boolean;
  is_signature: boolean;
  image_url: string | null;
};

function validateProduct(input: ProductInput): string | null {
  const name = input.name.trim();
  if (name.length < 2) return "El nombre es obligatorio.";
  if (!input.category_id) return "Selecciona una categoría.";
  if (!Number.isFinite(input.price) || input.price < 0) {
    return "Precio inválido.";
  }
  return null;
}

export async function upsertProduct(input: ProductInput): Promise<ActionResult> {
  const validationError = validateProduct(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const payload = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    category_id: input.category_id,
    is_available: input.is_available,
    is_signature: input.is_signature,
    image_url: input.image_url,
  };

  if (input.id) {
    const { error } = await gate.supabase
      .from("products")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await gate.supabase.from("products").insert(payload);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { error } = await gate.supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return { ok: true };
}
