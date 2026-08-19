"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
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

export function ProductCard({ product, accent = "gold", onOpenDetail }: ProductCardProps) {
  const quantity =
    useCartStore(
      (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
    );
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const notifyAdded = useCartUiStore((s) => s.notifyAdded);

  const accentText =
    accent === "sakura" ? "text-shimai-sakura" : "text-shimai-gold";
  const accentBorder =
    accent === "sakura" ? "border-shimai-sakura/40" : "border-shimai-gold/35";

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden border bg-shimai-surface/80 transition-colors",
        "border-white/[0.06] hover:border-shimai-gold/25",
      )}
    >
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`Ver ${product.name}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-shimai-black text-left"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(201,164,92,0.12),transparent_55%)]">
            <span className="font-serif text-4xl text-shimai-gold/25">鮨</span>
          </div>
        )}

        <span className="pointer-events-none absolute inset-0 bg-shimai-black/0 transition-colors group-hover:bg-shimai-black/15" />

        <span className="pointer-events-none absolute bottom-3 right-3 border border-white/10 bg-shimai-black/75 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.16em] text-shimai-ivory/75 opacity-100 backdrop-blur-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          Ver
        </span>

        {product.is_signature ? (
          <span
            className={cn(
              "pointer-events-none absolute left-3 top-3 border bg-shimai-black/80 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-shimai-gold backdrop-blur-sm",
              accentBorder,
            )}
          >
            Shimai Signature
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="font-sans text-sm font-medium leading-snug text-shimai-ivory">
            {product.name}
          </h3>
          {product.description ? (
            <p className="line-clamp-2 font-sans text-xs leading-relaxed text-shimai-ivory/50">
              {product.description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <p className={cn("font-serif text-xl tracking-tight", accentText)}>
            {formatMxn(Number(product.price))}
          </p>

          {quantity === 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="border border-shimai-ivory/15 px-3 text-shimai-ivory hover:border-shimai-gold/40 hover:text-shimai-gold"
              onClick={() => {
                addItem(product.id, 1);
                notifyAdded(product.name);
              }}
            >
              Agregar
            </Button>
          ) : (
            <div className="flex h-8 items-center gap-2 border border-shimai-gold/30 px-1">
              <button
                type="button"
                aria-label="Disminuir"
                className="h-7 w-7 font-sans text-shimai-ivory/80 hover:text-shimai-gold"
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
                className="h-7 w-7 font-sans text-shimai-ivory/80 hover:text-shimai-gold"
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
