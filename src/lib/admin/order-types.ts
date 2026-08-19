import type {
  Order,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
  Profile,
} from "@/types/database";

export type AdminOrderItem = Pick<
  OrderItem,
  "id" | "product_id" | "quantity" | "unit_price"
>;

export type AdminOrder = Order & {
  profiles: Pick<Profile, "id" | "full_name" | "phone"> | null;
  order_items: AdminOrderItem[];
};

export function clientDisplayName(order: AdminOrder): string {
  const name = order.profiles?.full_name?.trim();
  if (name) return name;
  if (order.client_phone?.trim()) return order.client_phone.trim();
  return "Cliente invitado";
}

export function canValidateBankTransfer(order: AdminOrder): boolean {
  return (
    order.payment_method === ("bank_transfer" satisfies PaymentMethod) &&
    order.payment_status === ("awaiting_proof" satisfies PaymentStatus)
  );
}
