import { NextResponse } from "next/server";

import { flushPendingPushes } from "@/lib/notifications/push-queue";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow service-role style local flush only when secret unset in development
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Reliable push worker (FoodCore cron equivalent).
 * Render cron → POST every minute with Authorization: Bearer CRON_SECRET
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await flushPendingPushes();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
