"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CartDrawer } from "@/components/public/CartDrawer";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { selectCartCount, useCartStore } from "@/stores/cartStore";

type SiteHeaderProps = {
  products: MenuProduct[];
};

export function SiteHeader({ products }: SiteHeaderProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => selectCartCount(s.items));

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleCount = mounted ? count : 0;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-shimai-black/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="font-serif text-xl tracking-wide text-shimai-ivory sm:text-2xl">
              SHIMAI
            </span>
            <span className="hidden font-sans text-[10px] uppercase tracking-[0.22em] text-shimai-gold/70 sm:inline">
              Sushi House
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex h-10 items-center gap-2 border border-shimai-gold/30 px-3 font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory transition-colors hover:border-shimai-gold hover:text-shimai-gold"
            aria-label="Abrir carrito"
          >
            Carrito
            {visibleCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center bg-shimai-gold px-1 font-sans text-[11px] font-medium text-shimai-black">
                {visibleCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        products={products}
      />
    </>
  );
}
