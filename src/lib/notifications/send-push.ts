import webpush from "web-push";

import type { NotificationPayload } from "@/lib/notifications/events";
import { getShimaiVapidConfig } from "@/lib/notifications/vapid";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendWebPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: NotificationPayload,
): Promise<{ sent: number; failed: number }> {
  const vapid = await getShimaiVapidConfig();
  if (!vapid || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
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
          const service = createServiceRoleClient();
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

export async function sendDriverPush(
  driverId: string,
  payload: NotificationPayload,
): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("driver_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("driver_id", driverId);

  const result = await sendWebPushToSubscriptions(data ?? [], payload);
  return result.sent;
}

export async function sendClientPush(
  orderId: string,
  payload: NotificationPayload,
): Promise<number> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("client_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("order_id", orderId);

  const result = await sendWebPushToSubscriptions(data ?? [], payload);
  return result.sent;
}
