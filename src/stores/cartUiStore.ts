import { create } from "zustand";

export type CartToast = {
  id: number;
  productName: string;
};

type CartUiState = {
  drawerOpen: boolean;
  toast: CartToast | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  notifyAdded: (productName: string) => void;
  dismissToast: () => void;
};

export const useCartUiStore = create<CartUiState>((set) => ({
  drawerOpen: false,
  toast: null,
  openDrawer: () => set({ drawerOpen: true, toast: null }),
  closeDrawer: () => set({ drawerOpen: false }),
  notifyAdded: (productName) =>
    set({
      toast: { id: Date.now(), productName },
    }),
  dismissToast: () => set({ toast: null }),
}));
