import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartLineItem, CartState } from "@/types";

type CartActions = {
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

/**
 * Client cart UI state only: { productId, quantity }.
 * Totals are computed exclusively by the checkout Edge Function.
 */
export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set) => ({
      items: [],
      addItem: (productId, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === productId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { productId, quantity } satisfies CartLineItem],
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i,
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "shimai-cart" },
  ),
);

export function selectCartCount(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
