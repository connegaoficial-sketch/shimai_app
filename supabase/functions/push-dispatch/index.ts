import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

/**
 * Reliable push worker — runs on Supabase (pg_cron every minute).
 * Replaces Render cron → POST /api/push/dispatch.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
const APP_URL = (
  Deno.env.get("SHIMAI_APP_URL") ||
  Deno.env.get("APP_ORIGIN") ||
  "https://shimai.onrender.com"
).replace(/\/$/, "");

const RETRY_WINDOW_MS = 10 * 60 * 1000;

type PendingRow = {
  id: string;
  audience: "driver" | "client";
  recipient_id: string | null;
  order_id: string | null;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  dedup_key: string | null;
};

type NotificationPayload = {
  kind: string;
  orderId: string;
  title: string;
  body: string;
  url: string;
  tag?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: "shimai" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function rowToPayload(row: PendingRow): NotificationPayload | null {
  if (!row.order_id) return null;
  return {
    kind: row.kind,
    orderId: row.order_id,
    title: row.title,
    body: row.body,
    url:
      row.link ??
      (row.audience === "driver"
        ? `/driver/orders/${row.order_id}`
        : `/tracker/${row.order_id}`),
    tag: row.dedup_key ?? undefined,
  };
}

function pushAssetUrls() {
  const origin = APP_URL;
  return {
    icon: `${origin}/icon-192x192.png`,
    badge: `${origin}/icon-192x192.png`,
    image: `${origin}/logo_shimai.jpeg`,
  };
}

async function getVapidConfig(
  service: ReturnType<typeof createServiceClient>,
): Promise<VapidConfig | null> {
  const { data, error } = await service
    .from("settings")
    .select("value")
    .eq("key", "web_push_vapid")
    .maybeSingle();

  if (error || !data?.value || typeof data.value !== "object") return null;

  const row = data.value as Record<string, unknown>;
  const publicKey =
    typeof row.public_key === "string" ? row.public_key.trim() : "";
  const privateKey =
    typeof row.private_key === "string" ? row.private_key.trim() : "";
  const subject =
    typeof row.subject === "string" && row.subject.trim()
      ? row.subject.trim()
      : "mailto:hello@shimai.mx";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

async function sendWebPushToSubscriptions(
  service: ReturnType<typeof createServiceClient>,
  subscriptions: PushSubscriptionRow[],
  payload: NotificationPayload,
  vapid: VapidConfig,
): Promise<{ sent: number; failed: number }> {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const assets = pushAssetUrls();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    icon: assets.icon,
    badge: assets.badge,
    image: assets.image,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await service
            .from("driver_push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          await service
            .from("client_push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }),
  );

  return { sent, failed };
}

async function markPushSent(
  service: ReturnType<typeof createServiceClient>,
  notificationId: string,
): Promise<void> {
  await service
    .from("notifications")
    .update({ push_sent_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("push_sent_at", null);
}

async function processNotificationPush(
  service: ReturnType<typeof createServiceClient>,
  vapid: VapidConfig | null,
  notificationId: string,
): Promise<boolean> {
  const { data: row } = await service
    .from("notifications")
    .select(
      "id, audience, recipient_id, order_id, kind, title, body, link, dedup_key, push_sent_at",
    )
    .eq("id", notificationId)
    .maybeSingle();

  if (!row || row.push_sent_at) return Boolean(row?.push_sent_at);

  const payload = rowToPayload(row as PendingRow);
  if (!payload) {
    await markPushSent(service, notificationId);
    return false;
  }

  if (!vapid) {
    return false;
  }

  let sent = 0;
  if (row.audience === "driver" && row.recipient_id) {
    const { count } = await service
      .from("driver_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", row.recipient_id);
    if (!count) {
      await markPushSent(service, notificationId);
      return false;
    }
    const { data } = await service
      .from("driver_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("driver_id", row.recipient_id);
    const result = await sendWebPushToSubscriptions(
      service,
      data ?? [],
      payload,
      vapid,
    );
    sent = result.sent;
  } else if (row.audience === "client" && row.order_id) {
    const { count } = await service
      .from("client_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("order_id", row.order_id);
    if (!count) {
      await markPushSent(service, notificationId);
      return false;
    }
    const { data } = await service
      .from("client_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("order_id", row.order_id);
    const result = await sendWebPushToSubscriptions(
      service,
      data ?? [],
      payload,
      vapid,
    );
    sent = result.sent;
  } else {
    await markPushSent(service, notificationId);
    return false;
  }

  if (sent > 0) {
    await markPushSent(service, notificationId);
    return true;
  }

  return false;
}

async function flushPendingPushes(limit = 40): Promise<{
  processed: number;
  sent: number;
}> {
  const service = createServiceClient();
  const vapid = await getVapidConfig(service);
  const since = new Date(Date.now() - RETRY_WINDOW_MS).toISOString();

  const { data: pending } = await service
    .from("notifications")
    .select(
      "id, audience, recipient_id, order_id, kind, title, body, link, dedup_key, created_at",
    )
    .is("push_sent_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);

  let sent = 0;
  for (const row of pending ?? []) {
    const ok = await processNotificationPush(service, vapid, row.id);
    if (ok) sent += 1;
  }

  await service
    .from("notifications")
    .update({ push_sent_at: new Date().toISOString() })
    .is("push_sent_at", null)
    .lt("created_at", since);

  return { processed: pending?.length ?? 0, sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await flushPendingPushes();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[push-dispatch]", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "push_dispatch_failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
