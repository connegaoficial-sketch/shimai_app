import { DriverOrdersList } from "@/components/driver/DriverOrdersList";
import { requireDriverClient } from "@/lib/driver/require-driver";
import { redirect } from "next/navigation";

export default async function DriverHomePage() {
  const gate = await requireDriverClient();
  if (!gate.ok) redirect("/driver/login");

  const [{ data: assigned }, { data: available }] = await Promise.all([
    gate.supabase
      .from("orders")
      .select(
        "id, status, payment_method, payment_status, total, client_phone, delivery_address, driver_id, created_at",
      )
      .eq("driver_id", gate.driverId)
      .in("status", ["ready_for_pickup", "in_transit"])
      .order("created_at", { ascending: true }),
    gate.supabase
      .from("orders")
      .select(
        "id, status, payment_method, payment_status, total, client_phone, delivery_address, driver_id, created_at",
      )
      .is("driver_id", null)
      .eq("status", "ready_for_pickup")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <DriverOrdersList
      assigned={assigned ?? []}
      available={available ?? []}
    />
  );
}
