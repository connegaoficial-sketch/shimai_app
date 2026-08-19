/**
 * Promotions / coupons — parsed from settings.promos.
 * Money is always computed on the server (Edge Function); this module is shared
 * by admin, banner, and checkout UI.
 */

export type PromoType = "first_order" | "coupon" | "free_delivery";
export type PromoValueType = "percent" | "fixed";

export type Promo = {
  id: string;
  active: boolean;
  type: PromoType;
  title: string;
  subtitle: string;
  code: string;
  value_type: PromoValueType;
  value: number;
  min_subtotal: number;
  starts_at: string | null;
  ends_at: string | null;
};

export type PromosSetting = {
  items: Promo[];
};

export const DEFAULT_PROMOS: PromosSetting = { items: [] };

export const PROMO_CODE_STORAGE_KEY = "shimai-promo-code";

const PROMO_TYPES: PromoType[] = ["first_order", "coupon", "free_delivery"];
const VALUE_TYPES: PromoValueType[] = ["percent", "fixed"];

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isPromoLive(promo: Promo, now = new Date()): boolean {
  if (!promo.active) return false;
  if (promo.starts_at) {
    const start = new Date(promo.starts_at);
    if (!Number.isNaN(start.getTime()) && start > now) return false;
  }
  if (promo.ends_at) {
    const end = new Date(promo.ends_at);
    if (!Number.isNaN(end.getTime()) && end < now) return false;
  }
  return true;
}

export function livePromos(
  setting: PromosSetting,
  now = new Date(),
): Promo[] {
  return setting.items.filter((promo) => isPromoLive(promo, now));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown): boolean {
  return value === true;
}

export function parsePromo(raw: unknown): Promo | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = asString(row.type) as PromoType;
  if (!PROMO_TYPES.includes(type)) return null;

  const valueTypeRaw = asString(row.value_type) as PromoValueType;
  const value_type = VALUE_TYPES.includes(valueTypeRaw)
    ? valueTypeRaw
    : "percent";

  const id = asString(row.id) || crypto.randomUUID();
  const starts = asString(row.starts_at).trim();
  const ends = asString(row.ends_at).trim();

  return {
    id,
    active: asBool(row.active),
    type,
    title: asString(row.title).trim(),
    subtitle: asString(row.subtitle).trim(),
    code: normalizePromoCode(asString(row.code)),
    value_type,
    value: Math.max(0, asNumber(row.value)),
    min_subtotal: Math.max(0, asNumber(row.min_subtotal)),
    starts_at: starts || null,
    ends_at: ends || null,
  };
}

export function parsePromosSetting(value: unknown): PromosSetting {
  if (!value || typeof value !== "object") return DEFAULT_PROMOS;
  const row = value as { items?: unknown };
  if (!Array.isArray(row.items)) return DEFAULT_PROMOS;
  const items = row.items
    .map((item) => parsePromo(item))
    .filter((item): item is Promo => item !== null);
  return { items };
}

export function emptyPromo(): Promo {
  return {
    id: crypto.randomUUID(),
    active: true,
    type: "coupon",
    title: "",
    subtitle: "",
    code: "",
    value_type: "percent",
    value: 10,
    min_subtotal: 0,
    starts_at: null,
    ends_at: null,
  };
}

export function formatPromoValue(promo: Promo): string {
  if (promo.type === "free_delivery") {
    if (promo.min_subtotal > 0) {
      return `Envío gratis desde $${promo.min_subtotal}`;
    }
    return "Envío gratis";
  }
  if (promo.value_type === "percent") {
    return `${promo.value}% de descuento`;
  }
  return `$${promo.value} de descuento`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function promoMoneyOff(promo: Promo, subtotal: number): number {
  if (promo.type === "free_delivery") return 0;
  if (promo.min_subtotal > 0 && subtotal < promo.min_subtotal) return 0;
  if (promo.value_type === "percent") {
    const pct = Math.min(promo.value, 100);
    return roundMoney(subtotal * (pct / 100));
  }
  return roundMoney(Math.min(promo.value, subtotal));
}

export type CheckoutPreview = {
  discount: number;
  deliveryFee: number | null;
  total: number | null;
  promoLabel: string | null;
  couponInvalid: boolean;
};

/**
 * Display-only preview. Authoritative totals still come from the checkout
 * Edge Function at order time.
 */
export function previewCheckoutTotals(input: {
  subtotal: number;
  deliveryFee: number | null;
  promos: Promo[];
  promoCode: string;
  assumeFirstOrder?: boolean;
}): CheckoutPreview {
  const live = input.promos.filter((promo) => isPromoLive(promo));
  const entered = normalizePromoCode(input.promoCode);
  let discount = 0;
  let deliveryFee = input.deliveryFee;
  const labels: string[] = [];
  let couponInvalid = false;

  if (entered) {
    const coupon = live.find(
      (promo) => promo.type === "coupon" && promo.code === entered,
    );
    if (!coupon) {
      couponInvalid = true;
    } else if (coupon.min_subtotal <= 0 || input.subtotal >= coupon.min_subtotal) {
      discount = promoMoneyOff(coupon, input.subtotal);
      labels.push(coupon.title || `Cupón ${coupon.code}`);
    }
  } else if (input.assumeFirstOrder !== false) {
    const firstOrder = live.find((promo) => promo.type === "first_order");
    if (
      firstOrder &&
      (firstOrder.min_subtotal <= 0 || input.subtotal >= firstOrder.min_subtotal)
    ) {
      discount = promoMoneyOff(firstOrder, input.subtotal);
      if (discount > 0) {
        labels.push(firstOrder.title || "Primera compra");
      }
    }
  }

  const freeDelivery = live.find((promo) => promo.type === "free_delivery");
  if (
    freeDelivery &&
    deliveryFee != null &&
    (freeDelivery.min_subtotal <= 0 || input.subtotal >= freeDelivery.min_subtotal)
  ) {
    deliveryFee = 0;
    labels.push(freeDelivery.title || "Envío gratis");
  }

  const total =
    deliveryFee == null
      ? null
      : roundMoney(Math.max(0, input.subtotal - discount) + deliveryFee);

  return {
    discount,
    deliveryFee,
    total,
    promoLabel: labels.length > 0 ? labels.join(" · ") : null,
    couponInvalid,
  };
}
