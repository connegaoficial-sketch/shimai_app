import { haversineKm } from "@/lib/delivery/haversine";
import type { DeliveryConfigSetting, DeliveryZone } from "@/types/database";

export const OUT_OF_COVERAGE_MESSAGE =
  "Lo sentimos, tu dirección está fuera de nuestra zona de cobertura";

export type DeliveryQuote =
  | {
      ok: true;
      distanceKm: number;
      deliveryFee: number;
      zone: DeliveryZone;
    }
  | {
      ok: false;
      distanceKm: number;
      reason: "out_of_coverage" | "invalid_config" | "invalid_coords";
      message: string;
    };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeDeliveryConfig(
  raw: unknown,
): DeliveryConfigSetting | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<DeliveryConfigSetting>;
  const kitchen = value.kitchen_coordinates;
  if (
    !kitchen ||
    !isFiniteNumber(kitchen.lat) ||
    !isFiniteNumber(kitchen.lng)
  ) {
    return null;
  }
  if (!Array.isArray(value.zones) || value.zones.length === 0) {
    return null;
  }
  const zones: DeliveryZone[] = value.zones
    .filter(
      (z): z is DeliveryZone =>
        !!z &&
        isFiniteNumber(z.radius_km) &&
        z.radius_km > 0 &&
        isFiniteNumber(z.fee) &&
        z.fee >= 0,
    )
    .sort((a, b) => a.radius_km - b.radius_km);

  if (zones.length === 0) return null;

  const maxRadius = isFiniteNumber(value.max_radius_km)
    ? value.max_radius_km
    : zones[zones.length - 1]!.radius_km;

  return {
    kitchen_coordinates: { lat: kitchen.lat, lng: kitchen.lng },
    zones,
    max_radius_km: maxRadius,
  };
}

/**
 * Client-side estimate only. Backend recomputes and may reject.
 */
export function quoteDeliveryFee(
  config: DeliveryConfigSetting,
  customerLat: number,
  customerLng: number,
): DeliveryQuote {
  if (!isFiniteNumber(customerLat) || !isFiniteNumber(customerLng)) {
    return {
      ok: false,
      distanceKm: 0,
      reason: "invalid_coords",
      message: "Selecciona una dirección válida en el mapa.",
    };
  }

  const normalized = normalizeDeliveryConfig(config);
  if (!normalized) {
    return {
      ok: false,
      distanceKm: 0,
      reason: "invalid_config",
      message: "Configuración de envío incompleta.",
    };
  }

  const distanceKm = haversineKm(
    normalized.kitchen_coordinates.lat,
    normalized.kitchen_coordinates.lng,
    customerLat,
    customerLng,
  );

  if (distanceKm > normalized.max_radius_km) {
    return {
      ok: false,
      distanceKm,
      reason: "out_of_coverage",
      message: OUT_OF_COVERAGE_MESSAGE,
    };
  }

  const zone = normalized.zones.find((z) => distanceKm <= z.radius_km);
  if (!zone) {
    return {
      ok: false,
      distanceKm,
      reason: "out_of_coverage",
      message: OUT_OF_COVERAGE_MESSAGE,
    };
  }

  return {
    ok: true,
    distanceKm,
    deliveryFee: zone.fee,
    zone,
  };
}
