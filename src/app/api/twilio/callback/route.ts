import { NextResponse } from "next/server";

/**
 * Placeholder for Twilio status / inbound callbacks.
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Twilio callback not configured yet." },
    { status: 501 },
  );
}
