"use client";

import { useEffect } from "react";

import { useCartUiStore } from "@/stores/cartUiStore";

const TOAST_MS = 2800;

export function CartToast() {
  const toast = useCartUiStore((s) => s.toast);
  const dismissToast = useCartUiStore((s) => s.dismissToast);

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
      className="pointer-events-none fixed right-4 z-[60] animate-shimai-toast-in-top sm:right-6"
      style={{
        top: "max(4.75rem, calc(env(safe-area-inset-top, 0px) + 4.25rem))",
      }}
    >
      <p className="w-fit max-w-[min(72vw,16rem)] truncate rounded-full border border-shimai-sakura/45 bg-shimai-black/95 px-4 py-2.5 text-center font-sans text-sm text-shimai-ivory shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <span className="text-shimai-sakura" aria-hidden>
          ✓
        </span>{" "}
        {toast.productName} · agregado
      </p>
    </div>
  );
}
