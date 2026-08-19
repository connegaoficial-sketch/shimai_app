"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/public/ProductCard";
import type { MenuCategory, MenuProduct } from "@/lib/menu/get-menu-data";
import { cn } from "@/lib/utils";

type MenuViewProps = {
  categories: MenuCategory[];
  products: MenuProduct[];
};

const TAB_LABELS: Record<string, string> = {
  ane: "Ane",
  imoto: "Imōto",
  futari: "Futari",
  "sakura-sweets": "Postres",
  "shimai-drinks": "Bebidas",
};

export function MenuView({ categories, products }: MenuViewProps) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug ?? "ane");

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === activeSlug) ?? categories[0],
    [activeSlug, categories],
  );

  const visibleProducts = useMemo(() => {
    if (!activeCategory) return [];
    return products.filter((p) => p.category_id === activeCategory.id);
  }, [activeCategory, products]);

  const isImoto = activeCategory?.slug === "imoto";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6">
      <header className="mb-8 space-y-3 animate-shimai-fade-up">
        <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-shimai-gold/80">
          Menú de la casa
        </p>
        <h1 className="font-serif text-4xl leading-none text-shimai-ivory sm:text-5xl">
          {activeCategory ? TAB_LABELS[activeCategory.slug] ?? activeCategory.name : "SHIMAI"}
        </h1>
        {activeCategory?.description ? (
          <p
            className={cn(
              "max-w-md font-sans text-sm leading-relaxed",
              isImoto ? "text-shimai-sakura/80" : "text-shimai-ivory/55",
            )}
          >
            {activeCategory.description}
          </p>
        ) : null}
      </header>

      <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-white/[0.06] bg-shimai-black/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <nav
          aria-label="Categorías"
          className="flex gap-1 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => {
            const active = category.slug === activeSlug;
            const label = TAB_LABELS[category.slug] ?? category.name;
            const sakura = category.slug === "imoto";

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveSlug(category.slug)}
                className={cn(
                  "relative shrink-0 px-3 py-2 font-serif text-lg transition-colors sm:px-4 sm:text-xl",
                  active
                    ? sakura
                      ? "text-shimai-sakura"
                      : "text-shimai-gold"
                    : "text-shimai-ivory/40 hover:text-shimai-ivory/70",
                )}
              >
                {label}
                {active ? (
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-px",
                      sakura ? "bg-shimai-sakura" : "bg-shimai-gold",
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {visibleProducts.length === 0 ? (
        <p className="font-sans text-sm text-shimai-ivory/50">
          Pronto agregaremos piezas a esta categoría.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              className="animate-shimai-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <ProductCard
                product={product}
                accent={isImoto ? "sakura" : "gold"}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
