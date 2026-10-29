import { NextResponse } from "next/server";

import { sendAdminPush } from "@/lib/notifications/send-push";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type NotifyAdminBody = {
  orderId: string;
  clientName?: string;
  total?: number;
};

export async function POST(request: Request) {
  let body: NotifyAdminBody;
  try {
    body = (await request.json()) as NotifyAdminBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: order } = await service
    .from("orders")
    .select("id, total, client_phone, profiles(full_name)")
    .eq("id", orderId)
    .maybeSingle();

  const shortId = orderId.slice(0, 8).toUpperCase();
  const profileName = (order?.profiles as { full_name?: string | null })
    ?.full_name;
  const clientName =
    body.clientName ||
    profileName ||
    order?.client_phone ||
    "Cliente nuevo";
  const total = body.total ?? Number(order?.total ?? 0);

  const result = await sendAdminPush({
    kind: "order_assigned",
    orderId,
    title: `🥢 ¡Nuevo Pedido en Cocina #${shortId}!`,
    body: `${clientName} · Total: $${total.toFixed(2)} MXN`,
    url: "/admin/orders",
    tag: `admin-order-${orderId}`,
  });

  return NextResponse.json({ ok: true, ...result });
}
