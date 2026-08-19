"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { formatMxn } from "@/lib/format";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useCartUiStore } from "@/stores/cartUiStore";

type ProductDetailModalProps = {
  open: boolean;
  product: MenuProduct | null;
  products: MenuProduct[];
  accent?: "gold" | "sakura";
  onClose: () => void;
  onNavigate: (productId: string) => void;
};

export function ProductDetailModal({
  open,
  product,
  products,
  accent = "gold",
  onClose,
  onNavigate,
}: ProductDetailModalProps) {
  const quantity = useCartStore((s) =>
    product
      ? (s.items.find((i) => i.productId === product.id)?.quantity ?? 0)
      : 0,
  );
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const notifyAdded = useCartUiStore((s) => s.notifyAdded);

  const currentIndex = useMemo(
    () => (product ? products.findIndex((p) => p.id === product.id) : -1),
    [product, products],
  );

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < products.length - 1;

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && hasPrev) {
        onNavigate(products[currentIndex - 1]!.id);
      }
      if (event.key === "ArrowRight" && hasNext) {
        onNavigate(products[currentIndex + 1]!.id);
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, onNavigate, products, currentIndex, hasPrev, hasNext]);

  if (!open || !product) return null;

  const accentText =
    accent === "sakura" ? "text-shimai-sakura" : "text-shimai-gold";
  const accentBorder =
    accent === "sakura" ? "border-shimai-sakura/40" : "border-shimai-gold/35";
  const accentBg =
    accent === "sakura" ? "bg-shimai-sakura" : "bg-shimai-gold";
  const accentHover =
    accent === "sakura"
      ? "hover:bg-shimai-sakura/90"
      : "hover:bg-shimai-gold/90";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        aria-label="Cerrar detalle del producto"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-shimai-backdrop-in"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-white/[0.08] bg-shimai-black",
          "animate-shimai-sheet-up md:max-h-[min(90dvh,820px)] md:max-w-2xl md:animate-shimai-modal-in md:rounded-sm md:shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
        )}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 bg-shimai-black md:aspect-[16/10]">
          {product.image_url ? (
            <Image
              key={product.id}
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(201,164,92,0.14),transparent_55%)]">
              <span className="font-serif text-6xl text-shimai-gold/25">鮨</span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-shimai-black/70 to-transparent" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
            {products.length > 1 ? (
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-shimai-ivory/55">
                {currentIndex + 1} / {products.length}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto border border-white/10 bg-shimai-black/70 px-3 py-1.5 font-sans text-xs text-shimai-ivory/80 backdrop-blur-sm transition-colors hover:text-shimai-ivory"
            >
              Cerrar
            </button>
          </div>

          {products.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Producto anterior"
                disabled={!hasPrev}
                onClick={() => hasPrev && onNavigate(products[currentIndex - 1]!.id)}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 border border-white/10 bg-shimai-black/70 px-2.5 py-2 font-sans text-lg text-shimai-ivory backdrop-blur-sm transition-opacity",
                  hasPrev ? "hover:text-shimai-gold" : "opacity-30",
                )}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Producto siguiente"
                disabled={!hasNext}
                onClick={() => hasNext && onNavigate(products[currentIndex + 1]!.id)}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 border border-white/10 bg-shimai-black/70 px-2.5 py-2 font-sans text-lg text-shimai-ivory backdrop-blur-sm transition-opacity",
                  hasNext ? "hover:text-shimai-gold" : "opacity-30",
                )}
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-2">
            {product.is_signature ? (
              <span
                className={cn(
                  "inline-block border bg-shimai-black/80 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-shimai-gold",
                  accentBorder,
                )}
              >
                Shimai Signature
              </span>
            ) : null}
            <h2
              id="product-detail-title"
              className="font-serif text-3xl leading-tight text-shimai-ivory"
            >
              {product.name}
            </h2>
            <p className={cn("font-serif text-2xl tracking-tight", accentText)}>
              {formatMxn(Number(product.price))}
            </p>
          </div>

          {product.description ? (
            <p className="font-sans text-sm leading-relaxed text-shimai-ivory/65">
              {product.description}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
            {quantity === 0 ? (
              <Button
                className={cn(
                  "h-11 flex-1 border text-shimai-black",
                  accentBg,
                  accentHover,
                  accent === "sakura" ? "border-shimai-sakura" : "border-shimai-gold",
                )}
                onClick={() => {
                  addItem(product.id, 1);
                  notifyAdded(product.name);
                }}
              >
                Agregar al pedido
              </Button>
            ) : (
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex h-11 items-center gap-3 border border-shimai-gold/30 px-2">
                  <button
                    type="button"
                    aria-label="Disminuir cantidad"
                    className="h-9 w-9 font-sans text-lg text-shimai-ivory/80 hover:text-shimai-gold"
                    onClick={() => setQuantity(product.id, quantity - 1)}
                  >
                    −
                  </button>
                  <span className="min-w-6 text-center font-sans text-base text-shimai-ivory">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    className="h-9 w-9 font-sans text-lg text-shimai-ivory/80 hover:text-shimai-gold"
                    onClick={() => setQuantity(product.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <p className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/45">
                  En tu carrito
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
