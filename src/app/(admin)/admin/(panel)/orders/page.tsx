import { OrdersKanban } from "@/components/admin/OrdersKanban";
import { getAdminOrders } from "@/lib/admin/orders";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return <OrdersKanban orders={orders} />;
}
