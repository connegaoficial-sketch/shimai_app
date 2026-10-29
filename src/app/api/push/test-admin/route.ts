import { NextResponse } from "next/server";

import { sendAdminPush } from "@/lib/notifications/send-push";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Sin permiso de administrador" },
      { status: 403 },
    );
  }

  const result = await sendAdminPush({
    kind: "order_assigned",
    orderId: "test",
    title: "🥢 ¡Prueba de Notificación SHIMAI!",
    body: "Tu celular está listo para recibir avisos de nuevos pedidos incluso con la pantalla bloqueada.",
    url: "/admin/orders",
    tag: `admin-test-${Date.now()}`,
  });

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
  });
}
