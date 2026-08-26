import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationPayload } from "@/lib/notifications/events";
import { processNotificationPush } from "@/lib/notifications/push-queue";
import type { Database } from "@/types/database";

type ShimaiClient = SupabaseClient<Database, "shimai">;

async function isKindEnabled(
  supabase: ShimaiClient,
  input: {
    audience: "driver" | "client";
    recipientId?: string | null;
    orderId: string;
    kind: string;
  },
): Promise<boolean> {
  let query = supabase
    .from("notification_prefs")
    .select("enabled")
    .eq("audience", input.audience)
    .eq("kind", input.kind)
    .limit(1);

  if (input.audience === "driver" && input.recipientId) {
    query = query.eq("recipient_id", input.recipientId);
  } else {
    query = query.eq("order_id", input.orderId);
  }

  const { data } = await query.maybeSingle();
  if (!data) return true;
  return data.enabled;
}

async function logNotification(
  supabase: ShimaiClient,
  input: {
    eventKind: string;
    orderId: string;
    recipientRole: "driver" | "client";
    recipientId?: string | null;
    pushSent: boolean;
    inAppSent: boolean;
    error?: string;
  },
): Promise<void> {
  await supabase.from("notification_log").insert({
    event_kind: input.eventKind,
    order_id: input.orderId,
    recipient_role: input.recipientRole,
    recipient_id: input.recipientId ?? null,
    push_sent: input.pushSent,
    in_app_sent: input.inAppSent,
    error: input.error ?? null,
  });
}

/**
 * Central notify path (FoodCore-style): insert once → Realtime inbox → push queue.
 * Dedup via payload.tag; prefs can mute a kind; push is marked after confirmed send.
 */
export async function notifyOrderEvent(input: {
  supabase: ShimaiClient;
  audience: "driver" | "client";
  recipientId?: string | null;
  payload: NotificationPayload;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string | null; skipped: boolean }> {
  const { supabase, audience, payload } = input;
  const recipientId =
    audience === "driver" ? (input.recipientId ?? null) : null;

  if (audience === "driver" && !recipientId) {
    return { id: null, skipped: true };
  }

  const enabled = await isKindEnabled(supabase, {
    audience,
    recipientId,
    orderId: payload.orderId,
    kind: payload.kind,
  });
  if (!enabled) {
    await logNotification(supabase, {
      eventKind: payload.kind,
      orderId: payload.orderId,
      recipientRole: audience,
      recipientId,
      pushSent: false,
      inAppSent: false,
      error: "muted_by_pref",
    });
    return { id: null, skipped: true };
  }

  if (payload.tag) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("dedup_key", payload.tag)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      return { id: existing.id, skipped: true };
    }
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      audience,
      recipient_id: recipientId,
      order_id: payload.orderId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      link: payload.url,
      is_read: false,
      metadata: (input.metadata ?? {}) as never,
      dedup_key: payload.tag ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Unique dedup race
    if (error.code === "23505" && payload.tag) {
      const { data: raced } = await supabase
        .from("notifications")
        .select("id")
        .eq("dedup_key", payload.tag)
        .maybeSingle();
      return { id: raced?.id ?? null, skipped: true };
    }

    await logNotification(supabase, {
      eventKind: payload.kind,
      orderId: payload.orderId,
      recipientRole: audience,
      recipientId,
      pushSent: false,
      inAppSent: false,
      error: error.message,
    });
    return { id: null, skipped: false };
  }

  const notificationId = data?.id ?? null;
  let pushSent = false;

  if (notificationId) {
    try {
      pushSent = await processNotificationPush(notificationId);
    } catch {
      pushSent = false;
    }
  }

  await logNotification(supabase, {
    eventKind: payload.kind,
    orderId: payload.orderId,
    recipientRole: audience,
    recipientId,
    pushSent,
    inAppSent: true,
  });

  return { id: notificationId, skipped: false };
}

export async function notifyDriver(input: {
  supabase: ShimaiClient;
  driverId: string;
  payload: NotificationPayload;
}): Promise<void> {
  await notifyOrderEvent({
    supabase: input.supabase,
    audience: "driver",
    recipientId: input.driverId,
    payload: input.payload,
  });
}

export async function notifyClient(input: {
  supabase: ShimaiClient;
  payload: NotificationPayload;
}): Promise<void> {
  await notifyOrderEvent({
    supabase: input.supabase,
    audience: "client",
    payload: input.payload,
  });
}
