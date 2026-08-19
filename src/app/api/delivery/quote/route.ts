import { NextResponse } from "next/server";

import { getDeliveryConfigServer } from "@/lib/delivery/get-delivery-config";
import {
  OUT_OF_COVERAGE_MESSAGE,
  quoteDeliveryFee,
} from "@/lib/delivery/zones";

export const runtime = "nodejs";

/**
 * Public UX quote — returns fee / coverage only.
 * Never exposes kitchen_coordinates.
 */
export async function POST(request: Request) {
  let body: { lat?: unknown; lng?: unknown };
  try {
    body = (await request.json()) as { lat?: unknown; lng?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  try {
    const config = await getDeliveryConfigServer();
    const quote = quoteDeliveryFee(config, lat, lng);

    if (!quote.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "OUT_OF_COVERAGE",
          error: quote.message || OUT_OF_COVERAGE_MESSAGE,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      delivery_fee: quote.deliveryFee,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Quote failed",
      },
      { status: 500 },
    );
  }
}
