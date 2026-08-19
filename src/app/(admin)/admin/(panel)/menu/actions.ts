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

  if (payload.is_signature) {
    const clearQuery = gate.supabase
      .from("products")
      .update({ is_signature: false })
      .eq("category_id", payload.category_id);
    const { error: clearError } = input.id
      ? await clearQuery.neq("id", input.id)
      : await clearQuery;
    if (clearError) return { ok: false, error: clearError.message };
  }

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

export type CategoryInput = {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
};

function slugifyCategoryName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "categoria";
}

export async function upsertCategory(
  input: CategoryInput,
): Promise<ActionResult> {
  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: "El nombre de la categoría es obligatorio." };
  }

  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const description = input.description.trim() || null;

  if (input.id) {
    const { error } = await gate.supabase
      .from("categories")
      .update({
        name,
        description,
        is_active: input.is_active,
      })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const base = slugifyCategoryName(name);
    let slug = base;
    let n = 2;
    for (;;) {
      const { data: existing } = await gate.supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-${n}`;
      n += 1;
    }

    const { data: last } = await gate.supabase
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await gate.supabase.from("categories").insert({
      name,
      slug,
      description,
      is_active: input.is_active,
      sort_order: (last?.sort_order ?? 0) + 1,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(
  categoryId: string,
): Promise<ActionResult> {
  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { count, error: countError } = await gate.supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Esta categoría tiene ${count} producto${count === 1 ? "" : "s"}. Muévelos o elimínalos antes de borrar el grupo.`,
    };
  }

  const { error } = await gate.supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return { ok: true };
}

export async function moveCategory(
  categoryId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const gate = await requireAdminClient();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  const { data: rows, error: listError } = await gate.supabase
    .from("categories")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (listError) return { ok: false, error: listError.message };
  const list = rows ?? [];
  const index = list.findIndex((row) => row.id === categoryId);
  if (index < 0) return { ok: false, error: "Categoría no encontrada." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= list.length) return { ok: true };

  const current = list[index]!;
  const neighbor = list[swapWith]!;

  const { error: firstError } = await gate.supabase
    .from("categories")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", current.id);
  if (firstError) return { ok: false, error: firstError.message };

  const { error: secondError } = await gate.supabase
    .from("categories")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);
  if (secondError) return { ok: false, error: secondError.message };

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return { ok: true };
}
