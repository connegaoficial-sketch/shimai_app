import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/types/database";

export default async function AdminMenuPage() {
  const supabase = await createClient();

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (productsResult.error) {
    throw new Error(`Failed to load products: ${productsResult.error.message}`);
  }
  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }

  return (
    <MenuAdmin
      products={(productsResult.data ?? []) as Product[]}
      categories={(categoriesResult.data ?? []) as Category[]}
    />
  );
}
