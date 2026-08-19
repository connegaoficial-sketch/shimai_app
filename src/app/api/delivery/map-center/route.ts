import { NextResponse } from "next/server";

import { DEFAULT_DELIVERY_CONFIG } from "@/lib/delivery/default-config";
import { getDeliveryPublicGeo } from "@/lib/delivery/quote-from-settings";

export const runtime = "nodejs";

/**
 * Public map bias — kitchen center only (no zone fees or full config).
 */
export async function GET() {
  const geo = await getDeliveryPublicGeo();
  if (geo) {
    return NextResponse.json({
      lat: geo.lat,
      lng: geo.lng,
      zoom: 14,
    });
  }

  return NextResponse.json({
    lat: DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lat,
    lng: DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lng,
    zoom: 14,
  });
}
