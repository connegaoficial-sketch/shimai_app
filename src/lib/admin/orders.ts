import { createClient } from "@/lib/supabase/server";
import type { AdminOrder } from "@/lib/admin/order-types";

export type {
  AdminOrder,
  AdminOrderItem,
  AdminOrderItemProduct,
} from "@/lib/admin/order-types";
export {
  canValidateBankTransfer,
  clientDisplayName,
} from "@/lib/admin/order-types";

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      profiles!orders_client_id_fkey ( id, full_name, phone ),
      order_items (
        id,
        product_id,
        quantity,
        unit_price,
        products (
          id,
          name,
          description,
          is_sushi,
          filling,
          topping,
          image_url
        )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }

  return (data ?? []) as AdminOrder[];
}
