import { NextResponse } from "next/server";

import { DEFAULT_DELIVERY_CONFIG } from "@/lib/delivery/default-config";
import { getDeliveryPublicGeo } from "@/lib/delivery/quote-from-settings";
import {
  isInMexicoBounds,
  MEXICO_PHOTON_BBOX,
} from "@/lib/delivery/mexico-bounds";

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

  let kitchenLat = DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lat;
  let kitchenLng = DEFAULT_DELIVERY_CONFIG.kitchen_coordinates.lng;
  let maxRadiusKm = DEFAULT_DELIVERY_CONFIG.max_radius_km;

  const geo = await getDeliveryPublicGeo();
  if (geo) {
    kitchenLat = geo.lat;
    kitchenLng = geo.lng;
    maxRadiusKm = Math.max(geo.maxRadiusKm * 2.5, 5);
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
  photonUrl.searchParams.set("bbox", MEXICO_PHOTON_BBOX);

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
          if (!isInMexicoBounds(lat, lng)) return null;
          const country = feature.properties?.country?.toLowerCase();
          if (country && country !== "mexico" && country !== "méxico") {
            return null;
          }
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
  const results = data
    .map((item) => ({
      id: String(item.place_id),
      label: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }))
    .filter((item) => isInMexicoBounds(item.lat, item.lng));

  return NextResponse.json({ results });
}
