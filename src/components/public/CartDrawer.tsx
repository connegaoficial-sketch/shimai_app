"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { formatMxn } from "@/lib/format";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  products: MenuProduct[];
};

export function CartDrawer({ open, onClose, products }: CartDrawerProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar carrito"
        className="absolute inset-0 bg-black/70 animate-shimai-backdrop-in"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        className="relative flex h-full w-full max-w-md flex-col border-l border-shimai-gold/20 bg-shimai-black animate-shimai-drawer-in"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-shimai-gold/70">
              Tu pedido
            </p>
            <h2 className="font-serif text-2xl text-shimai-ivory">Carrito</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-sm text-shimai-ivory/50 hover:text-shimai-ivory"
          >
            Cerrar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="pt-10 text-center font-sans text-sm text-shimai-ivory/45">
              Aún no hay piezas en tu carrito.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const product = productMap.get(item.productId);
                return (
                  <li
                    key={item.productId}
                    className="border border-white/[0.06] bg-shimai-surface/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-sans text-sm text-shimai-ivory">
                          {product?.name ?? "Producto"}
                        </p>
                        {product ? (
                          <p className="font-serif text-base text-shimai-gold">
                            {formatMxn(Number(product.price))}
                            <span className="ml-1 font-sans text-[11px] text-shimai-ivory/40">
                              c/u · ref.
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="shrink-0 font-sans text-xs text-shimai-ivory/40 hover:text-seal-red"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-3 flex h-8 w-fit items-center gap-2 border border-shimai-gold/25 px-1">
                      <button
                        type="button"
                        className="h-7 w-7 text-shimai-ivory/80 hover:text-shimai-gold"
                        onClick={() =>
                          setQuantity(item.productId, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center font-sans text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-7 w-7 text-shimai-ivory/80 hover:text-shimai-gold"
                        onClick={() =>
                          setQuantity(item.productId, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {items.length > 0 ? (
            <p className="mt-6 font-sans text-[11px] leading-relaxed text-shimai-ivory/35">
              El total final se confirma al completar tu pedido.
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "border-t border-white/[0.06] bg-shimai-black p-5",
            "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          )}
        >
          <Button
            variant="primary"
            size="lg"
            className="w-full font-sans tracking-wide"
            disabled={items.length === 0}
            onClick={() => {
              onClose();
              router.push("/checkout");
            }}
          >
            {items.length === 0 ? "Carrito vacío" : "Ordenar"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
