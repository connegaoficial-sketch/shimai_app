"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FeaturedProduct } from "@/components/public/FeaturedProduct";
import { ProductCard } from "@/components/public/ProductCard";
import { ProductDetailModal } from "@/components/public/ProductDetailModal";
import type { MenuCategory, MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";
import { useCartUiStore } from "@/stores/cartUiStore";

type MenuViewProps = {
  categories: MenuCategory[];
  products: MenuProduct[];
};

const TAB_FADE_MS = 160;

function pieceLabel(count: number, categoryName: string): string {
  if (count === 1) return `1 pieza en ${categoryName}`;
  return `${count} piezas en ${categoryName}`;
}

export function MenuView({ categories, products }: MenuViewProps) {
  const firstSlug = categories[0]?.slug ?? "";
  const [activeSlug, setActiveSlug] = useState(firstSlug);
  const [displayedSlug, setDisplayedSlug] = useState(firstSlug);
  const [fading, setFading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const drawerOpen = useCartUiStore((s) => s.drawerOpen);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (drawerOpen) setSelectedProductId(null);
  }, [drawerOpen]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      setActiveSlug("");
      setDisplayedSlug("");
      return;
    }
    if (!categories.some((category) => category.slug === activeSlug)) {
      setActiveSlug(categories[0]!.slug);
      setDisplayedSlug(categories[0]!.slug);
    }
  }, [activeSlug, categories]);

  const switchCategory = (slug: string) => {
    if (slug === activeSlug) return;
    setSelectedProductId(null);
    setActiveSlug(slug);
    setFading(true);
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = window.setTimeout(() => {
      setDisplayedSlug(slug);
      setFading(false);
      fadeTimerRef.current = null;
    }, TAB_FADE_MS);
  };

  const displayedCategory = useMemo(
    () => categories.find((c) => c.slug === displayedSlug) ?? categories[0],
    [displayedSlug, categories],
  );

  const visibleProducts = useMemo(() => {
    if (!displayedCategory) return [];
    return products.filter((p) => p.category_id === displayedCategory.id);
  }, [displayedCategory, products]);

  const featuredProduct = useMemo(() => {
    if (visibleProducts.length === 0) return null;
    return (
      visibleProducts.find((p) => p.is_signature) ?? visibleProducts[0] ?? null
    );
  }, [visibleProducts]);

  const gridProducts = useMemo(() => {
    if (!featuredProduct) return visibleProducts;
    return visibleProducts.filter((p) => p.id !== featuredProduct.id);
  }, [featuredProduct, visibleProducts]);

  const categoryLabel = displayedCategory?.name ?? "Menú";

  const selectedProduct = useMemo(
    () => visibleProducts.find((p) => p.id === selectedProductId) ?? null,
    [selectedProductId, visibleProducts],
  );

  return (
    <section
      id="menu"
      aria-labelledby="menu-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 pb-28 pt-10 sm:scroll-mt-[4.5rem] sm:px-6 sm:pt-14"
    >
      <header className="mb-8 space-y-3 animate-shimai-fade-up">
        <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-shimai-gold/80">
          Menú de la casa
        </p>
        <h2
          id="menu-heading"
          className="font-serif text-4xl leading-none text-shimai-ivory sm:text-5xl"
        >
          {categoryLabel}
        </h2>
        {displayedCategory?.description ? (
          <p className="max-w-md font-sans text-sm leading-relaxed text-shimai-ivory/55">
            {displayedCategory.description}
          </p>
        ) : null}
        {visibleProducts.length > 0 ? (
          <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-shimai-ivory/40">
            {pieceLabel(visibleProducts.length, categoryLabel)}
          </p>
        ) : null}
      </header>

      {categories.length > 0 ? (
        <div className="sticky top-16 z-20 -mx-4 mb-8 border-b border-white/[0.06] bg-shimai-black/92 px-4 backdrop-blur-md sm:top-[4.5rem] sm:-mx-6 sm:px-6">
          <nav
            aria-label="Categorías"
            className="flex gap-1 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => {
              const active = category.slug === activeSlug;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => switchCategory(category.slug)}
                  className={cn(
                    "relative shrink-0 px-3 py-2 font-serif text-lg transition-colors sm:px-4 sm:text-xl",
                    active
                      ? "text-shimai-gold"
                      : "text-shimai-ivory/40 hover:text-shimai-ivory/70",
                  )}
                >
                  {category.name}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-shimai-gold" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

      <div
        className={cn(
          "shimai-menu-fade",
          fading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0",
        )}
      >
        {visibleProducts.length === 0 ? (
          <p className="font-sans text-sm text-shimai-ivory/50">
            Pronto agregaremos piezas a esta categoría.
          </p>
        ) : (
          <>
            {featuredProduct ? (
              <FeaturedProduct
                product={featuredProduct}
                onOpenDetail={() => setSelectedProductId(featuredProduct.id)}
              />
            ) : null}

            {gridProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {gridProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-shimai-fade-up"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <ProductCard
                      product={product}
                      onOpenDetail={() => setSelectedProductId(product.id)}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <ProductDetailModal
        open={selectedProductId !== null}
        product={selectedProduct}
        products={visibleProducts}
        onClose={() => setSelectedProductId(null)}
        onNavigate={setSelectedProductId}
      />
    </section>
  );
}
