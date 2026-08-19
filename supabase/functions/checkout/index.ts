import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * SHIMAI checkout brain.
 * Frontend sends cart quantities + delivery coords only.
 * Prices, zone fees, and payment rules are resolved exclusively here
 * against schema `shimai`.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")?.trim() ?? "";
const APP_ORIGIN = (
  Deno.env.get("SHIMAI_APP_URL") ??
  Deno.env.get("APP_ORIGIN") ??
  Deno.env.get("SITE_URL") ??
  ""
).trim();

const ALLOWED_ORIGINS = String(
  Deno.env.get("SHIMAI_ALLOWED_ORIGINS") ||
    Deno.env.get("ALLOWED_ORIGINS") ||
    Deno.env.get("APP_ORIGIN") ||
    "",
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const OUT_OF_COVERAGE_MESSAGE =
  "Lo sentimos, tu dirección está fuera de nuestra zona de cobertura";

type PaymentMethod =
  | "card_online"
  | "cash"
  | "bank_transfer"
  | "card_terminal";

type PaymentStatus =
  | "pending"
  | "awaiting_proof"
  | "paid"
  | "failed"
  | "refunded";

type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "in_transit"
  | "delivered"
  | "cancelled";

type CartItemInput = {
  product_id: string;
  quantity: number;
};

type CheckoutRequest = {
  items: CartItemInput[];
  payment_method: PaymentMethod;
  /** Plain-text delivery address from Places / geocoder */
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_notes?: string | null;
  client_phone?: string | null;
  customer_name?: string | null;
  success_url?: string;
  cancel_url?: string;
};

type DeliveryZone = {
  radius_km: number;
  fee: number;
};

type DeliveryConfig = {
  kitchen_coordinates: { lat: number; lng: number };
  zones: DeliveryZone[];
  max_radius_km: number;
};

type PaymentMethodsSetting = Record<PaymentMethod, boolean>;

type BankDetails = {
  bank_name: string;
  clabe: string;
  account_number: string;
  holder_name: string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
};

type PricedLine = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  "card_online",
  "cash",
  "bank_transfer",
  "card_terminal",
];

function buildCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get("origin") || "";
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    requestOrigin,
  );
  const allowedOrigin =
    ALLOWED_ORIGINS.length === 0
      ? requestOrigin || "*"
      : ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : isLocalhost
      ? requestOrigin
      : requestOrigin || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(
  req: Request,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toCents(amount: number): number {
  return Math.round(roundMoney(amount) * 100);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" &&
    (PAYMENT_METHODS as string[]).includes(value);
}

function isValidAbsoluteHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveAppBase(req: Request, explicit?: string): string {
  if (isValidAbsoluteHttpUrl(explicit)) return explicit.replace(/\/$/, "");
  if (isValidAbsoluteHttpUrl(APP_ORIGIN)) return APP_ORIGIN.replace(/\/$/, "");
  const origin = req.headers.get("origin") || "";
  if (isValidAbsoluteHttpUrl(origin)) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "shimai" },
  });
}

async function resolveUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ") || !SUPABASE_ANON_KEY) {
    return null;
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt || jwt === SUPABASE_ANON_KEY) {
    return null;
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function paymentStatusFor(method: PaymentMethod): PaymentStatus {
  switch (method) {
    case "bank_transfer":
      return "awaiting_proof";
    case "card_online":
    case "cash":
    case "card_terminal":
      return "pending";
  }
}

function orderStatusFor(method: PaymentMethod): OrderStatus {
  switch (method) {
    case "card_online":
    case "bank_transfer":
      return "pending_payment";
    case "cash":
    case "card_terminal":
      return "confirmed";
  }
}

/** Mean Earth radius (km) — Haversine */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseDeliveryConfig(raw: unknown): DeliveryConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const kitchen = value.kitchen_coordinates as
    | { lat?: unknown; lng?: unknown }
    | undefined;
  const lat = Number(kitchen?.lat);
  const lng = Number(kitchen?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const zonesRaw = Array.isArray(value.zones) ? value.zones : [];
  const zones: DeliveryZone[] = zonesRaw
    .map((z) => {
      const row = z as { radius_km?: unknown; fee?: unknown };
      return {
        radius_km: Number(row.radius_km),
        fee: Number(row.fee),
      };
    })
    .filter(
      (z) =>
        Number.isFinite(z.radius_km) &&
        z.radius_km > 0 &&
        Number.isFinite(z.fee) &&
        z.fee >= 0,
    )
    .sort((a, b) => a.radius_km - b.radius_km);

  if (zones.length === 0) return null;

  const maxRadius = Number(value.max_radius_km);
  return {
    kitchen_coordinates: { lat, lng },
    zones,
    max_radius_km: Number.isFinite(maxRadius) && maxRadius > 0
      ? maxRadius
      : zones[zones.length - 1]!.radius_km,
  };
}

/**
 * Authoritative zone fee. Never trust client-sent delivery_fee.
 * Zones are evaluated ascending by radius_km (0→r1, r1→r2, …).
 */
function resolveZoneDeliveryFee(
  config: DeliveryConfig,
  customerLat: number,
  customerLng: number,
):
  | { ok: true; distanceKm: number; deliveryFee: number }
  | { ok: false; distanceKm: number; error: string } {
  const distanceKm = haversineKm(
    config.kitchen_coordinates.lat,
    config.kitchen_coordinates.lng,
    customerLat,
    customerLng,
  );

  if (distanceKm > config.max_radius_km) {
    return { ok: false, distanceKm, error: OUT_OF_COVERAGE_MESSAGE };
  }

  const zone = config.zones.find((z) => distanceKm <= z.radius_km);
  if (!zone) {
    return { ok: false, distanceKm, error: OUT_OF_COVERAGE_MESSAGE };
  }

  return {
    ok: true,
    distanceKm: roundMoney(distanceKm * 1000) / 1000,
    deliveryFee: roundMoney(zone.fee),
  };
}

async function createStripeCheckoutSession(input: {
  orderId: string;
  lines: PricedLine[];
  deliveryFee: number;
  successUrl: string;
  cancelUrl: string;
  customerPhone?: string | null;
}): Promise<{ id: string; url: string }> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.orderId);
  body.set("metadata[order_id]", input.orderId);
  body.set("metadata[app]", "shimai");

  if (input.customerPhone) {
    body.set("metadata[client_phone]", input.customerPhone);
  }

  input.lines.forEach((line, index) => {
    body.set(`line_items[${index}][price_data][currency]`, "mxn");
    body.set(
      `line_items[${index}][price_data][product_data][name]`,
      line.name,
    );
    body.set(
      `line_items[${index}][price_data][unit_amount]`,
      String(toCents(line.unit_price)),
    );
    body.set(`line_items[${index}][quantity]`, String(line.quantity));
  });

  if (input.deliveryFee > 0) {
    const index = input.lines.length;
    body.set(`line_items[${index}][price_data][currency]`, "mxn");
    body.set(
      `line_items[${index}][price_data][product_data][name]`,
      "Envío SHIMAI",
    );
    body.set(
      `line_items[${index}][price_data][unit_amount]`,
      String(toCents(input.deliveryFee)),
    );
    body.set(`line_items[${index}][quantity]`, "1");
  }

  const stripeResponse = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const stripeData = await stripeResponse.json();
  if (!stripeResponse.ok || !stripeData?.id || !stripeData?.url) {
    throw new Error(
      stripeData?.error?.message ||
        "Stripe Checkout session creation failed",
    );
  }

  return { id: String(stripeData.id), url: String(stripeData.url) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(req, 500, {
        error: "Server misconfigured: missing Supabase credentials",
      });
    }

    let payload: CheckoutRequest;
    try {
      payload = (await req.json()) as CheckoutRequest;
    } catch {
      return jsonResponse(req, 400, { error: "Invalid JSON body" });
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) {
      return jsonResponse(req, 400, { error: "Cart items are required" });
    }

    if (!isPaymentMethod(payload.payment_method)) {
      return jsonResponse(req, 400, {
        error:
          "payment_method must be one of: card_online, cash, bank_transfer, card_terminal",
      });
    }

    const addressText = String(payload.delivery_address ?? "").trim();
    const deliveryLat = Number(payload.delivery_lat);
    const deliveryLng = Number(payload.delivery_lng);

    if (!addressText) {
      return jsonResponse(req, 400, {
        error: "delivery_address is required",
      });
    }
    if (!Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng)) {
      return jsonResponse(req, 400, {
        error: "delivery_lat and delivery_lng are required",
      });
    }
    if (deliveryLat < -90 || deliveryLat > 90 || deliveryLng < -180 ||
      deliveryLng > 180
    ) {
      return jsonResponse(req, 400, {
        error: "delivery coordinates are out of range",
      });
    }

    const normalizedItems: CartItemInput[] = [];
    for (const item of items) {
      const productId = String(item?.product_id ?? "").trim();
      const quantity = Number(item?.quantity);
      if (!productId) {
        return jsonResponse(req, 400, {
          error: "Each item requires product_id",
        });
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return jsonResponse(req, 400, {
          error: `Invalid quantity for product ${productId}`,
        });
      }
      normalizedItems.push({ product_id: productId, quantity });
    }

    const user = await resolveUser(req);
    const service = createServiceClient();

    const { data: paymentMethodsRow, error: paymentMethodsError } =
      await service
        .from("settings")
        .select("value")
        .eq("key", "payment_methods")
        .maybeSingle();

    if (paymentMethodsError) {
      console.error("payment_methods settings error", paymentMethodsError);
      return jsonResponse(req, 500, {
        error: "Unable to load payment methods",
      });
    }

    const enabledMethods =
      (paymentMethodsRow?.value as PaymentMethodsSetting | null) ?? null;
    if (!enabledMethods?.[payload.payment_method]) {
      return jsonResponse(req, 400, {
        error: `Payment method '${payload.payment_method}' is not enabled`,
      });
    }

    const productIds = [...new Set(normalizedItems.map((i) => i.product_id))];
    const { data: products, error: productsError } = await service
      .from("products")
      .select("id, name, price, is_available")
      .in("id", productIds);

    if (productsError) {
      console.error("products lookup error", productsError);
      return jsonResponse(req, 500, { error: "Unable to validate products" });
    }

    const productMap = new Map<string, ProductRow>(
      ((products ?? []) as ProductRow[]).map((p) => [p.id, p]),
    );

    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length > 0) {
      return jsonResponse(req, 400, {
        error: "One or more products do not exist",
        missing_product_ids: missing,
      });
    }

    const unavailable = productIds.filter((id) => {
      const product = productMap.get(id);
      return !product?.is_available;
    });
    if (unavailable.length > 0) {
      return jsonResponse(req, 400, {
        error: "One or more products are unavailable",
        unavailable_product_ids: unavailable,
      });
    }

    const pricedLines: PricedLine[] = normalizedItems.map((item) => {
      const product = productMap.get(item.product_id)!;
      const unitPrice = roundMoney(Number(product.price));
      return {
        product_id: product.id,
        name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: roundMoney(unitPrice * item.quantity),
      };
    });

    const subtotal = roundMoney(
      pricedLines.reduce((sum, line) => sum + line.line_total, 0),
    );

    const { data: deliveryRow, error: deliveryError } = await service
      .from("settings")
      .select("value")
      .eq("key", "delivery_config")
      .maybeSingle();

    if (deliveryError) {
      console.error("delivery_config settings error", deliveryError);
      return jsonResponse(req, 500, {
        error: "Unable to load delivery configuration",
      });
    }

    const deliveryConfig = parseDeliveryConfig(deliveryRow?.value);
    if (!deliveryConfig) {
      return jsonResponse(req, 500, {
        error: "Delivery configuration is incomplete",
      });
    }

    const quote = resolveZoneDeliveryFee(
      deliveryConfig,
      deliveryLat,
      deliveryLng,
    );
    if (!quote.ok) {
      return jsonResponse(req, 400, {
        error: quote.error,
        code: "OUT_OF_COVERAGE",
        distance_km: quote.distanceKm,
        max_radius_km: deliveryConfig.max_radius_km,
      });
    }

    const deliveryFee = quote.deliveryFee;
    const totalFinal = roundMoney(subtotal + deliveryFee);

    const paymentStatus = paymentStatusFor(payload.payment_method);
    const orderStatus = orderStatusFor(payload.payment_method);
    const clientPhone = payload.client_phone
      ? String(payload.client_phone).trim()
      : null;
    const customerName = payload.customer_name
      ? String(payload.customer_name).trim()
      : null;

    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({
        client_id: user?.id ?? null,
        status: orderStatus,
        payment_method: payload.payment_method,
        payment_status: paymentStatus,
        total: totalFinal,
        delivery_fee: deliveryFee,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        delivery_distance_km: quote.distanceKm,
        delivery_address: {
          text: addressText,
          full_name: customerName,
          lat: deliveryLat,
          lng: deliveryLng,
        },
        delivery_notes: payload.delivery_notes
          ? String(payload.delivery_notes)
          : null,
        client_phone: clientPhone,
      })
      .select(
        "id, status, payment_status, payment_method, total, delivery_fee, created_at",
      )
      .single();

    if (orderError || !order) {
      console.error("order insert error", orderError);
      return jsonResponse(req, 500, { error: "Unable to create order" });
    }

    const { error: itemsError } = await service.from("order_items").insert(
      pricedLines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
      })),
    );

    if (itemsError) {
      console.error("order_items insert error", itemsError);
      await service.from("orders").delete().eq("id", order.id);
      return jsonResponse(req, 500, { error: "Unable to create order items" });
    }

    const baseResponse = {
      success: true as const,
      order_id: order.id,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      currency: "MXN",
      subtotal,
      delivery_fee: deliveryFee,
      delivery_distance_km: quote.distanceKm,
      total: totalFinal,
      items: pricedLines,
    };

    if (payload.payment_method === "card_online") {
      const base = resolveAppBase(req, payload.success_url);
      const successUrl = isValidAbsoluteHttpUrl(payload.success_url)
        ? payload.success_url
        : `${base}/checkout/success?order_id=${order.id}`;
      const cancelUrl = isValidAbsoluteHttpUrl(payload.cancel_url)
        ? payload.cancel_url
        : `${base}/checkout/cancel?order_id=${order.id}`;

      try {
        const session = await createStripeCheckoutSession({
          orderId: order.id,
          lines: pricedLines,
          deliveryFee,
          successUrl,
          cancelUrl,
          customerPhone: clientPhone,
        });

        const { error: stripeUpdateError } = await service
          .from("orders")
          .update({ stripe_session_id: session.id })
          .eq("id", order.id);

        if (stripeUpdateError) {
          console.error("stripe_session_id update error", stripeUpdateError);
          return jsonResponse(req, 500, {
            error: "Order created but failed to persist Stripe session",
            order_id: order.id,
          });
        }

        return jsonResponse(req, 200, {
          ...baseResponse,
          stripe_session_id: session.id,
          checkout_url: session.url,
        });
      } catch (stripeError) {
        console.error("stripe session error", stripeError);
        await service
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", order.id);
        return jsonResponse(req, 500, {
          error: "Unable to create Stripe Checkout session",
          details: String(
            stripeError instanceof Error
              ? stripeError.message
              : stripeError,
          ),
          order_id: order.id,
        });
      }
    }

    if (payload.payment_method === "bank_transfer") {
      const { data: bankRow, error: bankError } = await service
        .from("settings")
        .select("value")
        .eq("key", "bank_details")
        .maybeSingle();

      if (bankError) {
        console.error("bank_details settings error", bankError);
        return jsonResponse(req, 500, {
          error: "Order created but bank details unavailable",
          order_id: order.id,
        });
      }

      return jsonResponse(req, 200, {
        ...baseResponse,
        bank_details: (bankRow?.value as BankDetails | null) ?? {
          bank_name: "",
          clabe: "",
          account_number: "",
          holder_name: "",
        },
        message:
          "Orden creada. Realiza la transferencia y sube tu comprobante.",
      });
    }

    return jsonResponse(req, 200, {
      ...baseResponse,
      message:
        payload.payment_method === "cash"
          ? "Orden confirmada. Pagarás en efectivo a la entrega."
          : "Orden confirmada. Se cobrará en terminal a la entrega.",
    });
  } catch (error) {
    console.error("Unexpected checkout error", error);
    return jsonResponse(req, 500, {
      error: "Internal server error",
      details: String(error instanceof Error ? error.message : error),
    });
  }
});
