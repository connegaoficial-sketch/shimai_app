"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useOrderingGate } from "@/components/public/OrderingGate";
import { ProductCardMeta } from "@/components/public/ProductCardMeta";
import { ProductPromoBadges } from "@/components/public/ProductPromoBadges";
import { formatMxn } from "@/lib/format";
import { shimaiBrand } from "@/lib/brand/shimai";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import type { ProductPromoBadge } from "@/lib/promos/promos";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useCartUiStore } from "@/stores/cartUiStore";

type FeaturedProductProps = {
  product: MenuProduct;
  accent?: "gold" | "sakura";
  promoBadges?: ProductPromoBadge[];
  onOpenDetail: () => void;
};

export function FeaturedProduct({
  product,
  accent = "gold",
  promoBadges = [],
  onOpenDetail,
}: FeaturedProductProps) {
  const quantity = useCartStore(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((s) => s.addItem);
  const notifyAdded = useCartUiStore((s) => s.notifyAdded);
  const { acceptingOrders } = useOrderingGate();

  const isSakura = accent === "sakura";
  const accentText = isSakura ? "text-shimai-sakura" : "text-shimai-gold";
  const accentBorder = isSakura
    ? "border-shimai-sakura/45"
    : "border-shimai-gold/40";

  return (
    <article
      className={cn(
        "shimai-product-card shimai-featured-card group mb-6 overflow-hidden border bg-shimai-surface/90 sm:mb-8",
        isSakura && "shimai-product-card--sakura shimai-featured-card--sakura",
        quantity > 0
          ? "shimai-product-card--in-cart border-shimai-gold/50"
          : "border-white/[0.1]",
      )}
    >
      <div className="grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={onOpenDetail}
          aria-label={`Ver ${product.name}`}
          className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden bg-shimai-black text-left sm:aspect-auto sm:min-h-[17rem]"
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="shimai-product-card-image object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                isSakura
                  ? "bg-[radial-gradient(circle_at_30%_20%,rgba(232,165,181,0.18),transparent_55%)]"
                  : "bg-[radial-gradient(circle_at_30%_20%,rgba(201,164,92,0.16),transparent_55%)]",
              )}
            >
              <span
                className={cn(
                  "font-serif text-6xl",
                  isSakura ? "text-shimai-sakura/30" : "text-shimai-gold/30",
                )}
              >
                鮨
              </span>
            </div>
          )}

          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-shimai-black via-shimai-black/25 to-transparent"
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/3 size-40 -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-300",
              isSakura
                ? "bg-shimai-sakura/30 opacity-50 group-hover:opacity-80"
                : "bg-shimai-gold/25 opacity-45 group-hover:opacity-75",
            )}
          />
          <span className="pointer-events-none absolute bottom-4 left-4 font-sans text-[11px] uppercase tracking-[0.2em] text-shimai-ivory/90">
            Buen punto de partida
          </span>
        </button>

        <div className="relative flex flex-col justify-center gap-4 p-5 sm:p-8">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-6 right-0 w-px",
              isSakura
                ? "bg-gradient-to-b from-transparent via-shimai-sakura/35 to-transparent"
                : "bg-gradient-to-b from-transparent via-shimai-gold/35 to-transparent",
            )}
          />
          <div className="space-y-2.5">
            <p
              className={cn(
                "font-sans text-[10px] uppercase tracking-[0.22em]",
                accentText,
              )}
            >
              {product.is_signature
                ? shimaiBrand.popularLabel
                : "Buena primera pieza"}
            </p>
            <ProductPromoBadges badges={promoBadges} placement="inline" />
            <h3 className="font-serif text-3xl leading-[1.1] tracking-tight text-shimai-ivory sm:text-4xl">
              {product.name}
            </h3>
            {product.is_sushi || product.description ? (
              <ProductCardMeta
                product={product}
                compact={false}
                className="max-w-md"
              />
            ) : (
              <p className="max-w-md font-sans text-sm leading-relaxed text-shimai-ivory/55">
                Súmala al pedido y, si te falta algo, el carrito te sugiere el
                siguiente paso.
              </p>
            )}
            <p
              className={cn(
                "pt-1 font-serif text-3xl tracking-tight",
                accentText,
              )}
            >
              {formatMxn(Number(product.price))}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              glow={false}
              className={cn(
                "h-11 rounded-full border px-4 text-shimai-ivory",
                accentBorder,
                isSakura
                  ? "hover:border-shimai-sakura hover:text-shimai-sakura"
                  : "hover:border-shimai-gold hover:text-shimai-gold",
              )}
              onClick={onOpenDetail}
            >
              Ver y decidir
            </Button>
            {quantity === 0 ? (
              <Button
                className="h-11 rounded-full px-6"
                variant={isSakura ? "sakura" : "primary"}
                disabled={!acceptingOrders}
                glow={acceptingOrders}
                onClick={() => {
                  if (!acceptingOrders) return;
                  addItem(product.id, 1);
                  notifyAdded(product.name);
                }}
              >
                {acceptingOrders ? shimaiBrand.featuredCta : "Hoy descansamos"}
              </Button>
            ) : (
              <p className="font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory/45">
                {quantity} en tu pedido
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
