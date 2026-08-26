import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Exposes a Maps JavaScript key to the browser.
 * Prefer NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (HTTP referrer restricted).
 * Falls back to GOOGLE_MAPS_API_KEY for single-key Axius setups.
 */
export async function GET() {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY no configurada" },
      { status: 503 },
    );
  }

  return NextResponse.json({ apiKey });
}
