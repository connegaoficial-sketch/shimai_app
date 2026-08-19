import type { CheckoutSuccessResponse } from "@/lib/stripe";

export const CHECKOUT_RESULT_KEY = "shimai-last-checkout";

export type StoredCheckoutResult = CheckoutSuccessResponse & {
  customer_name?: string;
};

export function storeCheckoutResult(result: StoredCheckoutResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKOUT_RESULT_KEY, JSON.stringify(result));
}

export function readCheckoutResult(): StoredCheckoutResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CHECKOUT_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCheckoutResult;
  } catch {
    return null;
  }
}

export function clearCheckoutResult(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHECKOUT_RESULT_KEY);
}
