import { OrdersKanbanLive } from "@/components/admin/OrdersKanbanLive";
import { getAdminOrders } from "@/lib/admin/orders";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return <OrdersKanbanLive orders={orders} />;
}
