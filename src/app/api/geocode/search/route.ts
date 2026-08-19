import { NextResponse } from "next/server";

import { getDeliveryConfigServer } from "@/lib/delivery/get-delivery-config";

export const runtime = "nodejs";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type PhotonFeature = {
  properties?: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

function degDeltaForKm(km: number, lat: number): { dLat: number; dLng: number } {
  const dLat = km / 111.32;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = km / (111.32 * Math.max(cos, 0.2));
  return { dLat, dLng };
}

function formatPhotonLabel(feature: PhotonFeature): string {
  const p = feature.properties ?? {};
  const parts = [
    [p.street, p.housenumber].filter(Boolean).join(" "),
    p.name,
    p.district,
    p.city,
    p.state,
  ].filter((part) => part && String(part).trim().length > 0);
  return parts.join(", ") || "Dirección";
}

/**
 * Address autocomplete for checkout.
 * Biases results near the Dark Kitchen using server-only coordinates
 * (never returned to the client).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  let kitchenLat = 19.432608;
  let kitchenLng = -99.133209;
  let maxRadiusKm = 8;

  try {
    const config = await getDeliveryConfigServer();
    kitchenLat = config.kitchen_coordinates.lat;
    kitchenLng = config.kitchen_coordinates.lng;
    maxRadiusKm = Math.max(config.max_radius_km * 2.5, 5);
  } catch {
    // Fall back to CDMX bias if settings unavailable
  }

  const { dLat, dLng } = degDeltaForKm(maxRadiusKm, kitchenLat);
  const viewbox = [
    kitchenLng - dLng,
    kitchenLat + dLat,
    kitchenLng + dLng,
    kitchenLat - dLat,
  ].join(",");

  const headers = {
    Accept: "application/json",
    "User-Agent": "SHIMAI-Sushi-House/1.0 (checkout address autocomplete)",
  };

  // Photon first (better street matching), then Nominatim
  const photonUrl = new URL("https://photon.komoot.io/api/");
  photonUrl.searchParams.set("q", q);
  photonUrl.searchParams.set("lang", "es");
  photonUrl.searchParams.set("limit", "7");
  photonUrl.searchParams.set("lat", String(kitchenLat));
  photonUrl.searchParams.set("lon", String(kitchenLng));

  try {
    const photonRes = await fetch(photonUrl.toString(), {
      headers,
      next: { revalidate: 0 },
    });
    if (photonRes.ok) {
      const photonData = (await photonRes.json()) as {
        features?: PhotonFeature[];
      };
      const results = (photonData.features ?? [])
        .map((feature) => {
          const coords = feature.geometry?.coordinates;
          if (!coords || coords.length < 2) return null;
          const [lng, lat] = coords;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return {
            id: `photon-${feature.properties?.osm_id ?? `${lat},${lng}`}`,
            label: formatPhotonLabel(feature),
            lat,
            lng,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (results.length > 0) {
        return NextResponse.json({ results });
      }
    }
  } catch {
    // continue to Nominatim
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", q);
  nominatimUrl.searchParams.set("format", "json");
  nominatimUrl.searchParams.set("addressdetails", "0");
  nominatimUrl.searchParams.set("limit", "7");
  nominatimUrl.searchParams.set("countrycodes", "mx");
  nominatimUrl.searchParams.set("viewbox", viewbox);
  nominatimUrl.searchParams.set("bounded", "0");

  const response = await fetch(nominatimUrl.toString(), {
    headers,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Geocoder unavailable", results: [] },
      { status: 502 },
    );
  }

  const data = (await response.json()) as NominatimResult[];
  const results = data.map((item) => ({
    id: String(item.place_id),
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));

  return NextResponse.json({ results });
}
