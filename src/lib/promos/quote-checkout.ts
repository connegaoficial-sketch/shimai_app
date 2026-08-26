"use server";

import {
  computeBogoDiscount,
  expandEligibleUnitPrices,
} from "@/lib/promos/bogo";
import {
  formatPromoCheckoutLabel,
  isPromoLive,
  normalizePromoCode,
  parsePromosSetting,
  promoMoneyOff,
  type PromoBreakdownLine,
} from "@/lib/promos/promos";
import { createClient } from "@/lib/supabase/server";

export type QuoteLineInput = {
  productId: string;
  quantity: number;
};

export type QuoteCheckoutResult =
  | {
      ok: true;
      subtotal: number;
      discount: number;
      deliveryFee: number | null;
      total: number | null;
      promoLabel: string | null;
      promoLines: PromoBreakdownLine[];
      couponInvalid: boolean;
      lines: {
        productId: string;
        name: string;
        quantity: number;
        lineTotal: number;
      }[];
    }
  | {
      ok: false;
      error: string;
    };

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Server-side checkout quote. Prices and discounts never trusted from the client.
 */
export async function quoteCheckoutTotals(input: {
  items: QuoteLineInput[];
  promoCode?: string;
  deliveryFee?: number | null;
  /** When false, skip optimistic first_order (returning customer). Default true for UX. */
  assumeFirstOrder?: boolean;
}): Promise<QuoteCheckoutResult> {
  const supabase = await createClient();

  const productIds = [
    ...new Set(
      input.items
        .map((i) => i.productId)
        .filter((id) => typeof id === "string" && id.length > 0),
    ),
  ];

  if (productIds.length === 0) {
    return {
      ok: true,
      subtotal: 0,
      discount: 0,
      deliveryFee: input.deliveryFee ?? null,
      total:
        input.deliveryFee == null ? null : roundMoney(input.deliveryFee),
      promoLabel: null,
      promoLines: [],
      couponInvalid: false,
      lines: [],
    };
  }

  const [{ data: products, error: productsError }, { data: promoRow }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, is_available")
        .in("id", productIds),
      supabase.from("settings").select("value").eq("key", "promos").maybeSingle(),
    ]);

  if (productsError) {
    return { ok: false, error: productsError.message };
  }

  const byId = new Map(
    (products ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        is_available: p.is_available,
      },
    ]),
  );

  const lines: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  for (const item of input.items) {
    const product = byId.get(item.productId);
    if (!product || !product.is_available) continue;
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (quantity <= 0) continue;
    const unitPrice = product.price;
    lines.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice,
      lineTotal: roundMoney(unitPrice * quantity),
    });
  }

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineTotal, 0),
  );

  const live = parsePromosSetting(promoRow?.value).items.filter((p) =>
    isPromoLive(p),
  );
  const entered = normalizePromoCode(input.promoCode ?? "");
  let discount = 0;
  const promoLines: PromoBreakdownLine[] = [];
  let couponInvalid = false;
  let deliveryFee = input.deliveryFee ?? null;

  if (entered) {
    const coupon = live.find(
      (promo) => promo.type === "coupon" && promo.code === entered,
    );
    if (!coupon) {
      couponInvalid = true;
    } else if (
      coupon.min_subtotal <= 0 ||
      subtotal >= coupon.min_subtotal
    ) {
      const off = promoMoneyOff(coupon, subtotal);
      if (off > 0) {
        discount += off;
        promoLines.push({
          kind: "money",
          type: coupon.type,
          label: formatPromoCheckoutLabel(coupon),
          amount: off,
        });
      }
    }
  } else if (input.assumeFirstOrder !== false) {
    const firstOrder = live.find((promo) => promo.type === "first_order");
    if (
      firstOrder &&
      (firstOrder.min_subtotal <= 0 || subtotal >= firstOrder.min_subtotal)
    ) {
      const off = promoMoneyOff(firstOrder, subtotal);
      if (off > 0) {
        discount += off;
        promoLines.push({
          kind: "money",
          type: firstOrder.type,
          label: formatPromoCheckoutLabel(firstOrder),
          amount: off,
        });
      }
    }
  }

  for (const promo of live) {
    if (promo.type !== "bogo_free" && promo.type !== "bogo_half") continue;
    if (promo.min_subtotal > 0 && subtotal < promo.min_subtotal) continue;
    if (promo.product_ids.length === 0) continue;
    const units = expandEligibleUnitPrices(
      lines.map((l) => ({
        productId: l.productId,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
      promo.product_ids,
    );
    const bogoOff = computeBogoDiscount(
      units,
      promo.type,
      promo.type === "bogo_half" ? promo.value || 50 : 50,
    );
    if (bogoOff > 0) {
      discount += bogoOff;
      promoLines.push({
        kind: "money",
        type: promo.type,
        label: formatPromoCheckoutLabel(promo),
        amount: bogoOff,
      });
    }
  }

  const freeDelivery = live.find((promo) => promo.type === "free_delivery");
  if (
    freeDelivery &&
    deliveryFee != null &&
    (freeDelivery.min_subtotal <= 0 || subtotal >= freeDelivery.min_subtotal)
  ) {
    deliveryFee = 0;
    promoLines.push({
      kind: "delivery",
      type: freeDelivery.type,
      label: formatPromoCheckoutLabel(freeDelivery),
      amount: null,
    });
  }

  discount = roundMoney(Math.min(discount, subtotal));
  const total =
    deliveryFee == null
      ? null
      : roundMoney(Math.max(0, subtotal - discount) + deliveryFee);

  const labels = promoLines.map((line) => line.label);

  return {
    ok: true,
    subtotal,
    discount,
    deliveryFee,
    total,
    promoLabel: labels.length > 0 ? labels.join(" · ") : null,
    promoLines,
    couponInvalid,
    lines: lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
  };
}
