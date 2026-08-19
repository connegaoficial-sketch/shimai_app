"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CartDrawer } from "@/components/public/CartDrawer";
import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { shimaiBrand } from "@/lib/brand/shimai";
import type { MenuProduct } from "@/lib/menu/get-menu-data";
import { selectCartCount, useCartStore } from "@/stores/cartStore";
import { useCartUiStore } from "@/stores/cartUiStore";

type SiteHeaderProps = {
  products: MenuProduct[];
};

export function SiteHeader({ products }: SiteHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => selectCartCount(s.items));
  const cartOpen = useCartUiStore((s) => s.drawerOpen);
  const openDrawer = useCartUiStore((s) => s.openDrawer);
  const closeDrawer = useCartUiStore((s) => s.closeDrawer);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleCount = mounted ? count : 0;

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-shimai-black/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <span className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
              <ShimaiLogo variant="emblem" priority className="h-full w-full" />
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="font-serif text-lg leading-none tracking-wide text-shimai-ivory">
                {shimaiBrand.name}
              </span>
              <span className="mt-0.5 font-sans text-[9px] uppercase tracking-[0.22em] text-shimai-gold/70">
                {shimaiBrand.tagline}
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Acciones">
            <button
              type="button"
              onClick={scrollToMenu}
              className="hidden h-10 items-center px-3 font-sans text-[11px] uppercase tracking-[0.16em] text-shimai-ivory/60 transition-colors hover:text-shimai-gold sm:flex"
            >
              Menú
            </button>

            <button
              type="button"
              onClick={openDrawer}
              className="relative flex h-10 items-center gap-2 border border-shimai-gold/30 px-3 font-sans text-xs uppercase tracking-[0.16em] text-shimai-ivory transition-colors hover:border-shimai-gold hover:text-shimai-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shimai-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shimai-black"
              aria-label="Abrir carrito"
            >
              Carrito
              {visibleCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center bg-shimai-gold px-1 font-sans text-[11px] font-medium text-shimai-black">
                  {visibleCount}
                </span>
              ) : null}
            </button>
          </nav>
        </div>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={closeDrawer}
        products={products}
      />
    </>
  );
}
