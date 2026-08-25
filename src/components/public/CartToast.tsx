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
      className="fixed z-[60] mx-auto max-w-sm animate-shimai-toast-in border border-shimai-gold/30 bg-shimai-black/95 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md left-4 right-[5.5rem] sm:left-auto sm:right-6 sm:top-24 sm:bottom-auto sm:w-[22rem]"
      style={{
        bottom:
          "max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))",
      }}
    >
      <p className="font-sans text-sm text-shimai-ivory">
        <span className="text-shimai-gold">✓</span> {toast.productName} en tu
        pedido
      </p>
      <button
        type="button"
        onClick={openDrawer}
        className="mt-1 min-h-11 font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-gold/80 transition-colors duration-150 hover:text-shimai-gold active:scale-[0.97]"
      >
        Ver pedido · ¿Qué más sumo?
      </button>
    </div>
  );
}
