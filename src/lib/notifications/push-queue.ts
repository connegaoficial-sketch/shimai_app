import type { NotificationPayload } from "@/lib/notifications/events";
import {
  sendClientPush,
  sendDriverPush,
} from "@/lib/notifications/send-push";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
  created_at: string;
};

function rowToPayload(row: PendingRow): NotificationPayload | null {
  if (!row.order_id) return null;
  return {
    kind: row.kind as NotificationPayload["kind"],
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

async function markPushSent(
  service: ReturnType<typeof createServiceRoleClient>,
  notificationId: string,
): Promise<void> {
  await service
    .from("notifications")
    .update({ push_sent_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("push_sent_at", null);
}

/**
 * Send Web Push for one notification and mark push_sent_at only after success
 * (or when there is nothing to deliver). Transient failures stay pending for cron.
 */
export async function processNotificationPush(
  notificationId: string,
): Promise<boolean> {
  const service = createServiceRoleClient();
  const { data: row } = await service
    .from("notifications")
    .select(
      "id, audience, recipient_id, order_id, kind, title, body, link, dedup_key, created_at, push_sent_at",
    )
    .eq("id", notificationId)
    .maybeSingle();

  if (!row || row.push_sent_at) return Boolean(row?.push_sent_at);

  const payload = rowToPayload(row as PendingRow);
  if (!payload) {
    await markPushSent(service, notificationId);
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
    sent = await sendDriverPush(row.recipient_id, payload);
  } else if (row.audience === "client" && row.order_id) {
    const { count } = await service
      .from("client_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("order_id", row.order_id);
    if (!count) {
      await markPushSent(service, notificationId);
      return false;
    }
    sent = await sendClientPush(row.order_id, payload);
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

/** Cron/worker: retry pending pushes created in the last 10 minutes. */
export async function flushPendingPushes(limit = 40): Promise<{
  processed: number;
  sent: number;
}> {
  const service = createServiceRoleClient();
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
    const ok = await processNotificationPush(row.id);
    if (ok) sent += 1;
  }

  await service
    .from("notifications")
    .update({ push_sent_at: new Date().toISOString() })
    .is("push_sent_at", null)
    .lt("created_at", since);

  return { processed: pending?.length ?? 0, sent };
}
