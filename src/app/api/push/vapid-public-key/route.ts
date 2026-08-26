import { NextResponse } from "next/server";

import { getShimaiVapidPublicKey } from "@/lib/notifications/vapid";

export async function GET() {
  const publicKey = await getShimaiVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ publicKey: null }, { status: 200 });
  }
  return NextResponse.json({ publicKey });
}
