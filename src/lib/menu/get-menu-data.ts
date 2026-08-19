import { createPublicServerClient } from "@/lib/supabase/public-server";
import type {
  Category,
  PaymentMethodsSetting,
  Product,
} from "@/types";

export type MenuProduct = Product;
export type MenuCategory = Category;

export type MenuData = {
  categories: MenuCategory[];
  products: MenuProduct[];
  paymentMethods: PaymentMethodsSetting;
};

const DEFAULT_PAYMENT_METHODS: PaymentMethodsSetting = {
  card_online: true,
  cash: true,
  bank_transfer: true,
  card_terminal: true,
};

export async function getMenuData(): Promise<MenuData> {
  const supabase = createPublicServerClient();

  const [categoriesResult, productsResult, paymentMethodsResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "payment_methods")
        .maybeSingle(),
    ]);

  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }
  if (productsResult.error) {
    throw new Error(`Failed to load products: ${productsResult.error.message}`);
  }

  const paymentMethods =
    (paymentMethodsResult.data?.value as PaymentMethodsSetting | null) ??
    DEFAULT_PAYMENT_METHODS;

  return {
    categories: (categoriesResult.data ?? []) as MenuCategory[],
    products: (productsResult.data ?? []) as MenuProduct[],
    paymentMethods,
  };
}
