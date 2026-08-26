import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationPayload } from "@/lib/notifications/events";
import {
  sendClientPush,
  sendDriverPush,
} from "@/lib/notifications/send-push";
import type { Database } from "@/types/database";

type ShimaiClient = SupabaseClient<Database, "shimai">;

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

export async function notifyDriver(input: {
  supabase: ShimaiClient;
  driverId: string;
  payload: NotificationPayload;
}): Promise<void> {
  const { error } = await input.supabase.from("driver_notifications").insert({
    driver_id: input.driverId,
    order_id: input.payload.orderId,
    kind: input.payload.kind,
    title: input.payload.title,
    body: input.payload.body,
  });

  const inAppSent = !error;
  let pushSent = false;

  try {
    const sent = await sendDriverPush(input.driverId, input.payload);
    pushSent = sent > 0;
  } catch {
    pushSent = false;
  }

  await logNotification(input.supabase, {
    eventKind: input.payload.kind,
    orderId: input.payload.orderId,
    recipientRole: "driver",
    recipientId: input.driverId,
    pushSent,
    inAppSent,
    error: error?.message,
  });
}

export async function notifyClient(input: {
  supabase: ShimaiClient;
  payload: NotificationPayload;
}): Promise<void> {
  const { error } = await input.supabase.from("client_notifications").insert({
    order_id: input.payload.orderId,
    kind: input.payload.kind,
    title: input.payload.title,
    body: input.payload.body,
  });

  const inAppSent = !error;
  let pushSent = false;

  try {
    const sent = await sendClientPush(input.payload.orderId, input.payload);
    pushSent = sent > 0;
  } catch {
    pushSent = false;
  }

  await logNotification(input.supabase, {
    eventKind: input.payload.kind,
    orderId: input.payload.orderId,
    recipientRole: "client",
    pushSent,
    inAppSent,
    error: error?.message,
  });
}
