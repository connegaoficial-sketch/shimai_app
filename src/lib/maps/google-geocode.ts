import { isInMexicoBounds } from "@/lib/delivery/mexico-bounds";

export type GeocodeHit = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  houseNumber?: string | null;
  street?: string | null;
  neighbourhood?: string | null;
  city?: string | null;
};

/** Server-only. Prefer GOOGLE_MAPS_API_KEY (Axius). */
export function getGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    "";
  return key.length > 0 ? key : null;
}

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function component(
  parts: AddressComponent[] | undefined,
  type: string,
): string | null {
  const hit = parts?.find((c) => c.types.includes(type));
  return hit?.long_name?.trim() || null;
}

function labelFromComponents(
  parts: AddressComponent[] | undefined,
  fallback: string,
): {
  label: string;
  street: string | null;
  houseNumber: string | null;
  neighbourhood: string | null;
  city: string | null;
} {
  const street = component(parts, "route");
  const houseNumber = component(parts, "street_number");
  const neighbourhood =
    component(parts, "neighborhood") ||
    component(parts, "sublocality_level_1") ||
    component(parts, "sublocality");
  const city =
    component(parts, "locality") ||
    component(parts, "administrative_area_level_2");
  const state = component(parts, "administrative_area_level_1");

  const streetLine = [street, houseNumber].filter(Boolean).join(" ").trim();
  const partsLabel = [streetLine || null, neighbourhood, city, state].filter(
    (p) => p && p.length > 0,
  );

  return {
    label: partsLabel.length > 0 ? partsLabel.join(", ") : fallback,
    street,
    houseNumber,
    neighbourhood,
    city,
  };
}

type PlacesPrediction = {
  place_id: string;
  description: string;
};

type PlaceDetailsResult = {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  address_components?: AddressComponent[];
};

type GeocodeResult = {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  address_components?: AddressComponent[];
};

async function placeDetails(
  placeId: string,
  key: string,
): Promise<GeocodeHit | null> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "place_id,formatted_address,geometry,address_component",
  );
  url.searchParams.set("language", "es");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    result?: PlaceDetailsResult;
  };
  if (data.status !== "OK" || !data.result?.geometry?.location) return null;

  const lat = data.result.geometry.location.lat;
  const lng = data.result.geometry.location.lng;
  if (!isInMexicoBounds(lat, lng)) return null;

  const parsed = labelFromComponents(
    data.result.address_components,
    data.result.formatted_address ?? "Dirección",
  );

  return {
    id: `google-${data.result.place_id ?? placeId}`,
    label: parsed.label,
    lat,
    lng,
    houseNumber: parsed.houseNumber,
    street: parsed.street,
    neighbourhood: parsed.neighbourhood,
    city: parsed.city,
  };
}

/**
 * Places Autocomplete + Details (best street/number coverage in Mexico).
 * Falls back to Geocoding text search if Places is unavailable.
 */
export async function googleAddressSearch(input: {
  query: string;
  biasLat: number;
  biasLng: number;
  radiusMeters: number;
}): Promise<GeocodeHit[] | null> {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  const radius = Math.min(Math.max(Math.round(input.radiusMeters), 1000), 50000);

  try {
    const autoUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
    );
    autoUrl.searchParams.set("input", input.query);
    autoUrl.searchParams.set("components", "country:mx");
    autoUrl.searchParams.set("language", "es");
    autoUrl.searchParams.set(
      "location",
      `${input.biasLat},${input.biasLng}`,
    );
    autoUrl.searchParams.set("radius", String(radius));
    autoUrl.searchParams.set("key", key);

    const autoRes = await fetch(autoUrl.toString(), { next: { revalidate: 0 } });
    if (autoRes.ok) {
      const autoData = (await autoRes.json()) as {
        status?: string;
        predictions?: PlacesPrediction[];
      };

      if (
        autoData.status === "OK" &&
        (autoData.predictions?.length ?? 0) > 0
      ) {
        const top = (autoData.predictions ?? []).slice(0, 5);
        const detailed = await Promise.all(
          top.map((p) => placeDetails(p.place_id, key)),
        );
        const hits = detailed.filter((h): h is GeocodeHit => h !== null);
        if (hits.length > 0) return hits;
      }

      // ZERO_RESULTS is a valid empty answer — do not fall through to weaker providers
      if (autoData.status === "ZERO_RESULTS") return [];

      // REQUEST_DENIED / OVER_QUERY_LIMIT → try geocode fallback below
    }
  } catch {
    // try geocode fallback
  }

  try {
    const geoUrl = new URL(
      "https://maps.googleapis.com/maps/api/geocode/json",
    );
    geoUrl.searchParams.set("address", input.query);
    geoUrl.searchParams.set("components", "country:MX");
    geoUrl.searchParams.set("language", "es");
    geoUrl.searchParams.set("region", "mx");
    // Bias with viewport around kitchen
    const d = radius / 111_320;
    const cos = Math.max(Math.cos((input.biasLat * Math.PI) / 180), 0.2);
    const dLng = radius / (111_320 * cos);
    geoUrl.searchParams.set(
      "bounds",
      `${input.biasLat - d},${input.biasLng - dLng}|${input.biasLat + d},${input.biasLng + dLng}`,
    );
    geoUrl.searchParams.set("key", key);

    const geoRes = await fetch(geoUrl.toString(), { next: { revalidate: 0 } });
    if (!geoRes.ok) return null;
    const geoData = (await geoRes.json()) as {
      status?: string;
      results?: GeocodeResult[];
    };
    if (geoData.status === "ZERO_RESULTS") return [];
    if (geoData.status !== "OK" || !geoData.results?.length) return null;

    const hits: GeocodeHit[] = [];
    for (const r of geoData.results.slice(0, 7)) {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !isInMexicoBounds(lat, lng)
      ) {
        continue;
      }
      const parsed = labelFromComponents(
        r.address_components,
        r.formatted_address ?? "Dirección",
      );
      hits.push({
        id: `google-geo-${r.place_id ?? `${lat},${lng}`}`,
        label: parsed.label,
        lat,
        lng,
        houseNumber: parsed.houseNumber,
        street: parsed.street,
        neighbourhood: parsed.neighbourhood,
        city: parsed.city,
      });
    }
    return hits;
  } catch {
    return null;
  }
}

export async function googleReverseGeocode(input: {
  lat: number;
  lng: number;
}): Promise<GeocodeHit | null> {
  const key = getGoogleMapsApiKey();
  if (!key) return null;
  if (!isInMexicoBounds(input.lat, input.lng)) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${input.lat},${input.lng}`);
    url.searchParams.set("language", "es");
    url.searchParams.set("result_type", "street_address|premise|route");
    url.searchParams.set("key", key);

    let res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return null;
    let data = (await res.json()) as {
      status?: string;
      results?: GeocodeResult[];
    };

    // Broader reverse if strict result_type yields nothing
    if (data.status === "ZERO_RESULTS" || !data.results?.length) {
      const loose = new URL(
        "https://maps.googleapis.com/maps/api/geocode/json",
      );
      loose.searchParams.set("latlng", `${input.lat},${input.lng}`);
      loose.searchParams.set("language", "es");
      loose.searchParams.set("key", key);
      res = await fetch(loose.toString(), { next: { revalidate: 0 } });
      if (!res.ok) return null;
      data = (await res.json()) as {
        status?: string;
        results?: GeocodeResult[];
      };
    }

    if (data.status !== "OK" || !data.results?.[0]) return null;

    const r = data.results[0];
    const country = r.address_components?.find((c) =>
      c.types.includes("country"),
    )?.short_name;
    if (country && country.toUpperCase() !== "MX") return null;

    const parsed = labelFromComponents(
      r.address_components,
      r.formatted_address ?? "Dirección",
    );

    return {
      id: `google-rev-${r.place_id ?? `${input.lat},${input.lng}`}`,
      label: parsed.label,
      lat: input.lat,
      lng: input.lng,
      houseNumber: parsed.houseNumber,
      street: parsed.street,
      neighbourhood: parsed.neighbourhood,
      city: parsed.city,
    };
  } catch {
    return null;
  }
}
