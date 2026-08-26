import { PromosAdmin } from "@/components/admin/PromosAdmin";
import { DEFAULT_PROMOS, parsePromosSetting } from "@/lib/promos/promos";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPromosPage() {
  const supabase = await createClient();

  const [{ data: promoRow, error: promoError }, productsResult] =
    await Promise.all([
      supabase.from("settings").select("value").eq("key", "promos").maybeSingle(),
      supabase
        .from("products")
        .select("id, name, categories ( name )")
        .order("sort_order", { ascending: true }),
    ]);

  if (promoError) {
    throw new Error(`Failed to load promos: ${promoError.message}`);
  }

  const products = (productsResult.data ?? []).map((row) => {
    const category = row.categories as { name: string } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      categoryName: category?.name ?? "Sin categoría",
    };
  });

  return (
    <PromosAdmin
      promos={parsePromosSetting(promoRow?.value) ?? DEFAULT_PROMOS}
      products={products}
    />
  );
}
