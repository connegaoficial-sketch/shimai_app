"use client";

import { useEffect } from "react";

import { useCartUiStore } from "@/stores/cartUiStore";

const TOAST_MS = 3200;

export function CartToast() {
  const toast = useCartUiStore((s) => s.toast);
  const dismissToast = useCartUiStore((s) => s.dismissToast);
  const openDrawer = useCartUiStore((s) => s.openDrawer);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      className="fixed inset-x-4 bottom-6 z-[60] mx-auto max-w-sm animate-shimai-toast-in border border-shimai-gold/30 bg-shimai-black/95 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[22rem]"
    >
      <p className="font-sans text-sm text-shimai-ivory">
        <span className="text-shimai-gold">✓</span> {toast.productName} agregado
      </p>
      <button
        type="button"
        onClick={openDrawer}
        className="mt-1 font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-gold/80 transition-colors hover:text-shimai-gold"
      >
        Ver carrito
      </button>
    </div>
  );
}
