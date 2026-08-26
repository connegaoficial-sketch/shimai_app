import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SubscribeBody = {
  audience?: "driver" | "client";
  orderId?: string;
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  userAgent?: string;
};

export async function POST(request: Request) {
  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { audience, orderId, endpoint, p256dh, auth } = body;
  if (!audience || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const userAgent =
    body.userAgent?.slice(0, 400) ||
    request.headers.get("user-agent")?.slice(0, 400) ||
    null;

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (audience === "driver") {
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "driver") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const { error } = await supabase.from("driver_push_subscriptions").upsert(
      {
        driver_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: now,
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (audience === "client") {
    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.status === "cancelled") {
      return NextResponse.json({ error: "Pedido no válido" }, { status: 404 });
    }

    const { error } = await supabase.from("client_push_subscriptions").upsert(
      {
        order_id: orderId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: now,
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Audiencia inválida" }, { status: 400 });
}
