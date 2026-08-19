import { NextResponse } from "next/server";

import {
  formatCoordsLabel,
  isInMexicoBounds,
} from "@/lib/delivery/mexico-bounds";

export const runtime = "nodejs";

type NominatimReverse = {
  display_name?: string;
  address?: Record<string, string>;
};

export type ParsedAddress = {
  street: string | null;
  houseNumber: string | null;
  neighbourhood: string | null;
  city: string | null;
  state: string | null;
  label: string;
};

function parseAddress(address: Record<string, string>): ParsedAddress {
  const street =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.street ||
    null;
  const houseNumber = address.house_number || null;
  const neighbourhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.residential ||
    null;
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    null;
  const state =
    address.state || address.region || address["ISO3166-2-lvl4"] || null;

  const streetLine = street?.trim() || null;
  const parts = [streetLine, neighbourhood, city, state].filter(
    (part) => part && part.trim().length > 0,
  );

  return {
    street,
    houseNumber,
    neighbourhood,
    city,
    state,
    label: parts.join(", "),
  };
}

/**
 * Reverse geocode for map pin / GPS — Mexico only.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  if (!isInMexicoBounds(lat, lng)) {
    return NextResponse.json({
      label: null,
      street: null,
      house_number: null,
      lat,
      lng,
      outside_mexico: true,
    });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set("zoom", "19");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "SHIMAI-Sushi-House/1.0 (checkout reverse geocode)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const fallback = formatCoordsLabel(lat, lng);
      return NextResponse.json({
        label: fallback,
        street: null,
        house_number: null,
        lat,
        lng,
      });
    }

    const data = (await response.json()) as NominatimReverse;
    const countryCode = data.address?.country_code?.toLowerCase();

    if (countryCode && countryCode !== "mx") {
      return NextResponse.json({
        label: null,
        street: null,
        house_number: null,
        lat,
        lng,
        outside_mexico: true,
      });
    }

    if (data.address) {
      const parsed = parseAddress(data.address);
      return NextResponse.json({
        label: parsed.label || data.display_name || formatCoordsLabel(lat, lng),
        street: parsed.street,
        house_number: parsed.houseNumber,
        neighbourhood: parsed.neighbourhood,
        city: parsed.city,
        lat,
        lng,
      });
    }

    return NextResponse.json({
      label: data.display_name ?? formatCoordsLabel(lat, lng),
      street: null,
      house_number: null,
      lat,
      lng,
    });
  } catch {
    return NextResponse.json({
      label: formatCoordsLabel(lat, lng),
      street: null,
      house_number: null,
      lat,
      lng,
    });
  }
}
