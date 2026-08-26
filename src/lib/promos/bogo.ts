/**
 * BOGO / pair discounts — used by server quote + Edge checkout.
 * Never import this into client components for money decisions.
 */

export type BogoMode = "bogo_free" | "bogo_half";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Expand cart lines into per-unit prices for eligible products only.
 */
export function expandEligibleUnitPrices(
  lines: { productId: string; unitPrice: number; quantity: number }[],
  productIds: string[],
): number[] {
  if (productIds.length === 0) return [];
  const allowed = new Set(productIds);
  const units: number[] = [];
  for (const line of lines) {
    if (!allowed.has(line.productId)) continue;
    const price = Number(line.unitPrice);
    if (!Number.isFinite(price) || price < 0) continue;
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    for (let i = 0; i < qty; i++) units.push(price);
  }
  return units;
}

/**
 * Pair eligible units (sorted high→low):
 * - bogo_free (2×1): pay the higher, free the lower → discount = lower
 * - bogo_half: pay higher + half of lower → discount = lower * (percent/100)
 */
export function computeBogoDiscount(
  unitPrices: number[],
  mode: BogoMode,
  halfPercent = 50,
): number {
  if (unitPrices.length < 2) return 0;
  const sorted = [...unitPrices].sort((a, b) => b - a);
  const pct = Math.min(100, Math.max(0, halfPercent));
  let discount = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const lower = sorted[i + 1]!;
    if (mode === "bogo_free") {
      discount += lower;
    } else {
      discount += lower * (pct / 100);
    }
  }
  return roundMoney(discount);
}
