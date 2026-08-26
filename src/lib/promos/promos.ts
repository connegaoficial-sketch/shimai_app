/**
 * Promotions / coupons — parsed from settings.promos.
 * Authoritative money math runs on the server (checkout Edge + quote action).
 * This module is shared by admin, banner, and checkout UI for shapes/labels only.
 */

export type PromoType =
  | "first_order"
  | "coupon"
  | "free_delivery"
  | "bogo_free"
  | "bogo_half";

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
  /** Products eligible for BOGO pair promos. Empty = none. */
  product_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
};

export type PromosSetting = {
  items: Promo[];
};

export const DEFAULT_PROMOS: PromosSetting = { items: [] };

export const PROMO_CODE_STORAGE_KEY = "shimai-promo-code";

const PROMO_TYPES: PromoType[] = [
  "first_order",
  "coupon",
  "free_delivery",
  "bogo_free",
  "bogo_half",
];
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

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    ),
  ];
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

  const defaultHalf = type === "bogo_half" ? 50 : asNumber(row.value);

  return {
    id,
    active: asBool(row.active),
    type,
    title: asString(row.title).trim(),
    subtitle: asString(row.subtitle).trim(),
    code: normalizePromoCode(asString(row.code)),
    value_type,
    value: Math.max(0, type === "bogo_half" ? (asNumber(row.value, 50) || 50) : defaultHalf),
    min_subtotal: Math.max(0, asNumber(row.min_subtotal)),
    product_ids: asIdList(row.product_ids),
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
    product_ids: [],
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
  if (promo.type === "bogo_free") {
    const n = promo.product_ids.length;
    return n > 0 ? `2×1 · ${n} producto${n === 1 ? "" : "s"}` : "2×1";
  }
  if (promo.type === "bogo_half") {
    const pct = promo.value || 50;
    const n = promo.product_ids.length;
    return n > 0
      ? `2º al ${pct}% · ${n} producto${n === 1 ? "" : "s"}`
      : `2º al ${pct}%`;
  }
  if (promo.value_type === "percent") {
    return `${promo.value}% de descuento`;
  }
  return `$${promo.value} de descuento`;
}

/** Short label for product-card badges (sakura chips). */
export function productPromoBadgeLabel(promo: Promo): string {
  if (promo.type === "bogo_free") return "2×1";
  if (promo.type === "bogo_half") return `2º al ${promo.value || 50}%`;
  if (promo.type === "free_delivery") return "Envío gratis";
  if (promo.type === "first_order") return "1ª compra";
  if (promo.type === "coupon") {
    return promo.code ? promo.code : "Cupón";
  }
  return "Promo";
}

export type ProductPromoBadge = {
  promoId: string;
  type: PromoType;
  label: string;
};

/**
 * Map productId → badges for live promos that list that product.
 * Cart-wide promos without product_ids do not badge every item.
 */
export function buildProductPromoBadges(
  promos: Promo[],
  now = new Date(),
): Map<string, ProductPromoBadge[]> {
  const map = new Map<string, ProductPromoBadge[]>();
  for (const promo of promos) {
    if (!isPromoLive(promo, now)) continue;
    if (promo.product_ids.length === 0) continue;
    const badge: ProductPromoBadge = {
      promoId: promo.id,
      type: promo.type,
      label: productPromoBadgeLabel(promo),
    };
    for (const productId of promo.product_ids) {
      const list = map.get(productId) ?? [];
      list.push(badge);
      map.set(productId, list);
    }
  }
  return map;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Cart / coupon / first-order money off (not BOGO). */
export function promoMoneyOff(promo: Promo, subtotal: number): number {
  if (
    promo.type === "free_delivery" ||
    promo.type === "bogo_free" ||
    promo.type === "bogo_half"
  ) {
    return 0;
  }
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

/** One applied promo line for checkout / confirmation UI. */
export type PromoBreakdownLine = {
  kind: "money" | "delivery";
  type: PromoType;
  /** Clear customer-facing reason (2×1, Envío gratis, …). */
  label: string;
  /** Money off; null for delivery-only promos. */
  amount: number | null;
};

/**
 * Label that always names the promo kind so the customer knows
 * what is being discounted (not only a custom admin title).
 */
export function formatPromoCheckoutLabel(promo: Promo): string {
  const kind =
    promo.type === "free_delivery"
      ? "Envío gratis"
      : promo.type === "first_order"
        ? "Primera compra"
        : promo.type === "bogo_free"
          ? "2×1"
          : promo.type === "bogo_half"
            ? `1 y el siguiente al ${promo.value || 50}%`
            : promo.code
              ? `Cupón ${promo.code}`
              : "Cupón";

  const title = promo.title.trim();
  if (title && title !== kind) {
    return `${kind} · ${title}`;
  }
  return kind;
}

/**
 * @deprecated Prefer server `quoteCheckoutTotals`. Kept for non-BOGO fallbacks only.
 * Display-only; authoritative totals come from checkout Edge / quote action.
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
    } else if (
      coupon.min_subtotal <= 0 ||
      input.subtotal >= coupon.min_subtotal
    ) {
      discount = promoMoneyOff(coupon, input.subtotal);
      labels.push(formatPromoCheckoutLabel(coupon));
    }
  } else if (input.assumeFirstOrder !== false) {
    const firstOrder = live.find((promo) => promo.type === "first_order");
    if (
      firstOrder &&
      (firstOrder.min_subtotal <= 0 || input.subtotal >= firstOrder.min_subtotal)
    ) {
      discount = promoMoneyOff(firstOrder, input.subtotal);
      if (discount > 0) {
        labels.push(formatPromoCheckoutLabel(firstOrder));
      }
    }
  }

  const freeDelivery = live.find((promo) => promo.type === "free_delivery");
  if (
    freeDelivery &&
    deliveryFee != null &&
    (freeDelivery.min_subtotal <= 0 ||
      input.subtotal >= freeDelivery.min_subtotal)
  ) {
    deliveryFee = 0;
    labels.push(formatPromoCheckoutLabel(freeDelivery));
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
