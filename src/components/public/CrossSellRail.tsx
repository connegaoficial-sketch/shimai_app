"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatMxn } from "@/lib/format";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useCartUiStore } from "@/stores/cartUiStore";

type CrossSellRailProps = {
  title: string;
  subtitle?: string;
  products: MenuProduct[];
  onOpenProduct?: (productId: string) => void;
  compact?: boolean;
};

export function CrossSellRail({
  title,
  subtitle,
  products,
  onOpenProduct,
  compact = false,
}: CrossSellRailProps) {
  const addItem = useCartStore((s) => s.addItem);
  const notifyAdded = useCartUiStore((s) => s.notifyAdded);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [products, updateScrollState]);

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("li");
    const gap = 12;
    const step = (card?.offsetWidth ?? 152) + gap;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  if (products.length === 0) return null;

  const showNav = products.length > 1;

  return (
    <div
      data-cross-sell-rail
      className={cn(compact ? "space-y-3" : "space-y-4")}
      onKeyDown={(event) => {
        if (!showNav) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          scrollByCard(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          scrollByCard(1);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-xl text-shimai-ivory sm:text-2xl">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 font-sans text-xs leading-relaxed text-shimai-ivory/45">
              {subtitle}
            </p>
          ) : null}
          {showNav ? (
            <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-shimai-ivory/30">
              Desliza · ← →
            </p>
          ) : null}
        </div>

        {showNav ? (
          <div className="flex shrink-0 gap-1.5 pt-1">
            <button
              type="button"
              aria-label="Ver sugerencia anterior"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
              className="flex h-9 w-9 items-center justify-center border border-shimai-gold/30 font-sans text-sm text-shimai-ivory transition-[border-color,color,opacity,transform] duration-150 ease-out hover:border-shimai-gold hover:text-shimai-gold active:scale-[0.97] disabled:cursor-default disabled:opacity-25"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Ver siguiente sugerencia"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
              className="flex h-9 w-9 items-center justify-center border border-shimai-gold/30 font-sans text-sm text-shimai-ivory transition-[border-color,color,opacity,transform] duration-150 ease-out hover:border-shimai-gold hover:text-shimai-gold active:scale-[0.97] disabled:cursor-default disabled:opacity-25"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <ul
        ref={scrollerRef}
        tabIndex={showNav ? 0 : undefined}
        aria-label={title}
        className={cn(
          "flex gap-3 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x",
          "snap-x snap-mandatory scroll-smooth",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          showNav &&
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black",
        )}
      >
        {products.map((product) => (
          <li
            key={product.id}
            className={cn(
              "shimai-product-card shrink-0 snap-start overflow-hidden border border-white/[0.08] bg-shimai-surface/70",
              compact ? "w-[9.5rem]" : "w-[11.5rem]",
            )}
          >
            <button
              type="button"
              onClick={() => onOpenProduct?.(product.id)}
              className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-shimai-black text-left"
              aria-label={`Ver ${product.name}`}
            >
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="shimai-product-card-image object-cover"
                  sizes="180px"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center font-serif text-2xl text-shimai-gold/25">
                  鮨
                </span>
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-shimai-black/60 to-transparent"
              />
            </button>

            <div className="space-y-2 p-2.5">
              <button
                type="button"
                onClick={() => onOpenProduct?.(product.id)}
                className="w-full text-left"
              >
                <p className="line-clamp-2 font-sans text-xs leading-snug text-shimai-ivory">
                  {product.name}
                </p>
                <p className="mt-1 font-serif text-sm text-shimai-gold">
                  {formatMxn(Number(product.price))}
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  addItem(product.id, 1);
                  notifyAdded(product.name);
                }}
                className="h-8 w-full border border-shimai-gold/35 font-sans text-[10px] uppercase tracking-[0.14em] text-shimai-ivory transition-[transform,border-color,color] duration-150 ease-out hover:border-shimai-gold hover:text-shimai-gold active:scale-[0.97]"
              >
                Sumar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
