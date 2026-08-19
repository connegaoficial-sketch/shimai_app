import { notFound, redirect } from "next/navigation";

import { DriverOrderDetail } from "@/components/driver/DriverOrderDetail";
import { requireDriverClient } from "@/lib/driver/require-driver";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function DriverOrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const gate = await requireDriverClient();
  if (!gate.ok) redirect("/driver/login");

  const { data: order } = await gate.supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();
  if (order.driver_id !== gate.driverId) {
    redirect("/driver");
  }

  const { data: items } = await gate.supabase
    .from("order_items")
    .select("id, quantity, unit_price, product_id, products ( name )")
    .eq("order_id", orderId);

  const appUrl = (
    process.env.SHIMAI_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return (
    <DriverOrderDetail
      order={order}
      items={(items ?? []) as Array<{
        id: string;
        quantity: number;
        unit_price: number;
        product_id: string | null;
        products: { name: string } | null;
      }>}
      trackerUrl={`${appUrl}/tracker/${order.id}`}
    />
  );
}
