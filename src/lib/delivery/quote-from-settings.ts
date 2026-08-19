import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { Json } from "@/types/database";

import { OUT_OF_COVERAGE_MESSAGE } from "@/lib/delivery/zones";

export type ServerDeliveryQuote =
  | { ok: true; deliveryFee: number }
  | { ok: false; message: string; code: string };

type QuoteRpc = {
  ok?: boolean;
  delivery_fee?: number;
  error?: string;
  code?: string;
};

function asQuote(value: Json | null): QuoteRpc | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as QuoteRpc;
}

/**
 * Authoritative UX quote from settings.delivery_config.
 * Does not use hardcoded fallback fees (those were showing $60 when admin has $0).
 */
export async function quoteDeliveryFromSettings(
  lat: number,
  lng: number,
): Promise<ServerDeliveryQuote> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("quote_delivery_fee", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    return {
      ok: false,
      code: "QUOTE_FAILED",
      message: "No se pudo calcular el envío.",
    };
  }

  const quote = asQuote(data);
  if (!quote) {
    return {
      ok: false,
      code: "QUOTE_FAILED",
      message: "No se pudo calcular el envío.",
    };
  }

  if (quote.ok === true) {
    const fee = Number(quote.delivery_fee);
    if (Number.isFinite(fee) && fee >= 0) {
      return { ok: true, deliveryFee: fee };
    }
  }

  return {
    ok: false,
    code: quote.code ?? "OUT_OF_COVERAGE",
    message: quote.error ?? OUT_OF_COVERAGE_MESSAGE,
  };
}

export type DeliveryPublicGeo = {
  lat: number;
  lng: number;
  maxRadiusKm: number;
};

export async function getDeliveryPublicGeo(): Promise<DeliveryPublicGeo | null> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("delivery_public_geo");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const row = data as { lat?: unknown; lng?: unknown; max_radius_km?: unknown };
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  const maxRadiusKm = Number(row.max_radius_km);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    maxRadiusKm: Number.isFinite(maxRadiusKm) && maxRadiusKm > 0 ? maxRadiusKm : 10,
  };
}
