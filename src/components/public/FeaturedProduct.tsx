"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { formatMxn } from "@/lib/format";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useCartUiStore } from "@/stores/cartUiStore";

type FeaturedProductProps = {
  product: MenuProduct;
  accent?: "gold" | "sakura";
  onOpenDetail: () => void;
};

export function FeaturedProduct({
  product,
  accent = "gold",
  onOpenDetail,
}: FeaturedProductProps) {
  const quantity = useCartStore(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((s) => s.addItem);
  const notifyAdded = useCartUiStore((s) => s.notifyAdded);

  const accentText =
    accent === "sakura" ? "text-shimai-sakura" : "text-shimai-gold";
  const accentBorder =
    accent === "sakura" ? "border-shimai-sakura/40" : "border-shimai-gold/35";

  return (
    <article
      className={cn(
        "mb-6 overflow-hidden border bg-shimai-surface/80 sm:mb-8",
        "border-white/[0.08] hover:border-shimai-gold/25",
      )}
    >
      <div className="grid sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={onOpenDetail}
          aria-label={`Ver ${product.name}`}
          className="relative aspect-[16/10] w-full overflow-hidden bg-shimai-black sm:aspect-auto sm:min-h-[16rem]"
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(201,164,92,0.14),transparent_55%)]">
              <span className="font-serif text-6xl text-shimai-gold/25">鮨</span>
            </div>
          )}
        </button>

        <div className="flex flex-col justify-center gap-4 p-5 sm:p-7">
          <div className="space-y-2">
            <p
              className={cn(
                "font-sans text-[10px] uppercase tracking-[0.22em]",
                accentText,
              )}
            >
              {product.is_signature ? "Shimai Signature" : "Pieza de la casa"}
            </p>
            <h3 className="font-serif text-3xl leading-tight text-shimai-ivory">
              {product.name}
            </h3>
            {product.description ? (
              <p className="line-clamp-3 font-sans text-sm leading-relaxed text-shimai-ivory/55">
                {product.description}
              </p>
            ) : null}
            <p className={cn("font-serif text-2xl tracking-tight", accentText)}>
              {formatMxn(Number(product.price))}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              className={cn(
                "h-11 border px-4 text-shimai-ivory",
                accentBorder,
                "hover:text-shimai-gold",
              )}
              onClick={onOpenDetail}
            >
              Ver detalle
            </Button>
            {quantity === 0 ? (
              <Button
                className="h-11 px-5"
                variant={accent === "sakura" ? "sakura" : "primary"}
                onClick={() => {
                  addItem(product.id, 1);
                  notifyAdded(product.name);
                }}
              >
                Agregar
              </Button>
            ) : (
              <p className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/45">
                {quantity} en tu carrito
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
