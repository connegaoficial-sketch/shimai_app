"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { shimaiBrand } from "@/lib/brand/shimai";
import { formatMxn } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useCartUiStore } from "@/stores/cartUiStore";
import type { MenuProduct } from "@/lib/menu/get-menu-data";

type ProductCardProps = {
  product: MenuProduct;
  accent?: "gold" | "sakura";
  onOpenDetail?: () => void;
};

export function ProductCard({
  product,
  accent = "gold",
  onOpenDetail,
}: ProductCardProps) {
  const quantity = useCartStore(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const notifyAdded = useCartUiStore((s) => s.notifyAdded);

  const isSakura = accent === "sakura";
  const accentText = isSakura ? "text-shimai-sakura" : "text-shimai-gold";
  const accentBorder = isSakura
    ? "border-shimai-sakura/45"
    : "border-shimai-gold/40";
  const inCart = quantity > 0;

  return (
    <article
      className={cn(
        "shimai-product-card group flex flex-col overflow-hidden border bg-shimai-surface/85",
        isSakura && "shimai-product-card--sakura",
        inCart
          ? "shimai-product-card--in-cart border-shimai-gold/50"
          : "border-white/[0.07]",
      )}
    >
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`Ver ${product.name}`}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-shimai-black text-left"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="shimai-product-card-image object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              isSakura
                ? "bg-[radial-gradient(circle_at_30%_20%,rgba(232,165,181,0.16),transparent_55%)]"
                : "bg-[radial-gradient(circle_at_30%_20%,rgba(201,164,92,0.14),transparent_55%)]",
            )}
          >
            <span
              className={cn(
                "font-serif text-4xl",
                isSakura ? "text-shimai-sakura/30" : "text-shimai-gold/30",
              )}
            >
              鮨
            </span>
          </div>
        )}

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-shimai-black via-shimai-black/20 to-transparent opacity-85 transition-opacity duration-200 ease-out group-hover:opacity-95"
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-6 -top-8 size-28 rounded-full blur-2xl transition-opacity duration-300",
            isSakura
              ? "bg-shimai-sakura/25 opacity-40 group-hover:opacity-70"
              : "bg-shimai-gold/20 opacity-35 group-hover:opacity-65",
          )}
        />

        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <span className="shimai-product-card-cta font-sans text-[10px] uppercase tracking-[0.18em] text-shimai-ivory">
            Ver y elegir
          </span>
          <span
            aria-hidden
            className={cn(
              "shimai-product-card-cta font-sans text-sm",
              accentText,
            )}
          >
            →
          </span>
        </span>

        {product.is_signature ? (
          <span
            className={cn(
              "pointer-events-none absolute left-2.5 top-2.5 border bg-shimai-black/85 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm",
              accentBorder,
              accentText,
            )}
          >
            {shimaiBrand.popularShort}
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4">
        <button
          type="button"
          onClick={onOpenDetail}
          className="space-y-1 text-left"
        >
          <h3
            className={cn(
              "font-serif text-[0.95rem] font-medium leading-snug text-shimai-ivory transition-colors duration-200 sm:text-base",
              isSakura
                ? "group-hover:text-shimai-sakura"
                : "group-hover:text-shimai-gold",
            )}
          >
            {product.name}
          </h3>
          {product.description ? (
            <p className="line-clamp-2 font-sans text-xs leading-relaxed text-shimai-ivory/50">
              {product.description}
            </p>
          ) : null}
        </button>

        <div className="mt-auto flex items-end justify-between gap-2">
          <p
            className={cn(
              "font-serif text-xl tracking-tight sm:text-2xl",
              accentText,
            )}
          >
            {formatMxn(Number(product.price))}
          </p>

          {quantity === 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "border px-3 text-shimai-ivory transition-[border-color,color,transform] duration-200",
                isSakura
                  ? "border-shimai-sakura/25 hover:border-shimai-sakura/55 hover:text-shimai-sakura"
                  : "border-shimai-ivory/15 hover:border-shimai-gold/45 hover:text-shimai-gold",
              )}
              onClick={() => {
                addItem(product.id, 1);
                notifyAdded(product.name);
              }}
            >
              Agregar
            </Button>
          ) : (
            <div
              className={cn(
                "flex h-8 items-center gap-2 border px-1",
                isSakura ? "border-shimai-sakura/35" : "border-shimai-gold/35",
              )}
            >
              <button
                type="button"
                aria-label="Disminuir"
                className="h-7 w-7 font-sans text-shimai-ivory/80 transition-colors duration-150 hover:text-shimai-gold active:scale-[0.97]"
                onClick={() => setQuantity(product.id, quantity - 1)}
              >
                −
              </button>
              <span className="min-w-5 text-center font-sans text-sm text-shimai-ivory">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar"
                className="h-7 w-7 font-sans text-shimai-ivory/80 transition-colors duration-150 hover:text-shimai-gold active:scale-[0.97]"
                onClick={() => setQuantity(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
