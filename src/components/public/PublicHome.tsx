"use client";

import { MenuView } from "@/components/public/MenuView";
import { SiteHeader } from "@/components/public/SiteHeader";
import type {
  MenuCategory,
  MenuProduct,
} from "@/lib/menu/get-menu-data";

type PublicHomeProps = {
  categories: MenuCategory[];
  products: MenuProduct[];
};

export function PublicHome({ categories, products }: PublicHomeProps) {
  return (
    <>
      <SiteHeader products={products} />
      <div className="relative overflow-hidden border-b border-white/[0.05]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,164,92,0.14),transparent_55%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-shimai-gold">
            Dark kitchen · Las hermanas
          </p>
          <h1 className="max-w-xl font-serif text-5xl leading-[0.95] text-shimai-ivory sm:text-6xl">
            SHIMAI
          </h1>
          <p className="max-w-md font-sans text-sm leading-relaxed text-shimai-ivory/55">
            Dos hermanas. Un menú. Intensidad de Ane, frescura de Imōto, y lo
            que crean juntas.
          </p>
        </div>
      </div>
      <MenuView categories={categories} products={products} />
    </>
  );
}
