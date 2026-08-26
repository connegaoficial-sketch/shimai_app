"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FeaturedProduct } from "@/components/public/FeaturedProduct";
import { ProductCard } from "@/components/public/ProductCard";
import { ProductDetailModal } from "@/components/public/ProductDetailModal";
import { shimaiBrand } from "@/lib/brand/shimai";
import { buildProductPromoBadges } from "@/lib/promos/promos";
import type { Promo } from "@/lib/promos/promos";
import type { MenuCategory, MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";
import { useCartUiStore } from "@/stores/cartUiStore";

type MenuViewProps = {
  categories: MenuCategory[];
  products: MenuProduct[];
  promos?: Promo[];
};

const TAB_FADE_MS = 160;

function pieceLabel(count: number, categoryName: string): string {
  if (count === 1) return `1 pieza en ${categoryName}`;
  return `${count} piezas en ${categoryName}`;
}

export function MenuView({ categories, products, promos = [] }: MenuViewProps) {
  const firstSlug = categories[0]?.slug ?? "";
  const [activeSlug, setActiveSlug] = useState(firstSlug);
  const [displayedSlug, setDisplayedSlug] = useState(firstSlug);
  const [fading, setFading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const drawerOpen = useCartUiStore((s) => s.drawerOpen);

  const promoBadgesByProduct = useMemo(
    () => buildProductPromoBadges(promos),
    [promos],
  );
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
  const categoryAccent: "gold" | "sakura" =
    displayedCategory?.slug === "imoto" ||
    displayedCategory?.slug === "sakura-sweets"
      ? "sakura"
      : "gold";

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [selectedProductId, products],
  );

  return (
    <section
      id="menu"
      aria-labelledby="menu-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-32 pt-10 sm:scroll-mt-[5rem] sm:px-6 sm:pt-14"
    >
      <header className="mb-8 space-y-3 animate-shimai-fade-up">
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
        <p className="max-w-md font-sans text-sm leading-relaxed text-shimai-ivory/45">
          {shimaiBrand.undecidedLead}
        </p>
        {visibleProducts.length > 0 ? (
          <p className="font-sans text-xs text-shimai-ivory/40">
            {pieceLabel(visibleProducts.length, categoryLabel)}
          </p>
        ) : null}
      </header>

      {categories.length > 0 ? (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 -mx-4 mb-8 border-b border-white/[0.06] bg-shimai-black/92 px-4 backdrop-blur-md sm:top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:-mx-6 sm:px-6">
          <nav
            aria-label="Categorías"
            className="flex gap-1 overflow-x-auto overscroll-x-contain py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => {
              const active = category.slug === activeSlug;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => switchCategory(category.slug)}
                  className={cn(
                    "relative min-h-11 shrink-0 px-3 py-2 font-serif text-lg transition-colors sm:px-4 sm:text-xl",
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
                accent={categoryAccent}
                promoBadges={promoBadgesByProduct.get(featuredProduct.id) ?? []}
                onOpenDetail={() => setSelectedProductId(featuredProduct.id)}
              />
            ) : null}

            {gridProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {gridProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-shimai-fade-up"
                    style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                  >
                    <ProductCard
                      product={product}
                      accent={categoryAccent}
                      promoBadges={promoBadgesByProduct.get(product.id) ?? []}
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
        catalog={products}
        categories={categories}
        promoBadges={
          selectedProduct
            ? (promoBadgesByProduct.get(selectedProduct.id) ?? [])
            : []
        }
        onClose={() => setSelectedProductId(null)}
        onNavigate={(productId) => {
          const next = products.find((p) => p.id === productId);
          if (!next) return;
          const category = categories.find((c) => c.id === next.category_id);
          if (category && category.slug !== activeSlug) {
            setActiveSlug(category.slug);
            setDisplayedSlug(category.slug);
          }
          setSelectedProductId(productId);
        }}
      />
    </section>
  );
}
