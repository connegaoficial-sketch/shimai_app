import { CartToast } from "@/components/public/CartToast";
import { LandingHero } from "@/components/public/LandingHero";
import { MenuView } from "@/components/public/MenuView";
import { OrderPath } from "@/components/public/OrderPath";
import { PromoBanner } from "@/components/public/PromoBanner";
import { SakuraDivider } from "@/components/public/SakuraDivider";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SistersStory } from "@/components/public/SistersStory";
import { TrustStrip } from "@/components/public/TrustStrip";
import { WhatsAppFab } from "@/components/public/WhatsAppLink";
import type {
  MenuCategory,
  MenuProduct,
} from "@/lib/menu/get-menu-data";
import type { Promo } from "@/lib/promos/promos";

type PublicHomeProps = {
  categories: MenuCategory[];
  products: MenuProduct[];
  whatsappPhone: string;
  promos: Promo[];
};

/**
 * Ritmo sakura (opción 4):
 * - branches = pausas grandes (cambio de “mundo”)
 * - petals   = pausas medias (seguir leyendo sin ahogo)
 */
export function PublicHome({
  categories,
  products,
  whatsappPhone,
  promos,
}: PublicHomeProps) {
  return (
    <>
      <SiteHeader products={products} categories={categories} />
      <LandingHero />
      <SakuraDivider motif="petals" size="medium" />
      <TrustStrip />
      <PromoBanner promos={promos} />
      <SakuraDivider motif="branches" size="large" />
      <MenuView categories={categories} products={products} />
      <SakuraDivider motif="branches" size="large" />
      <OrderPath />
      <SakuraDivider motif="petals" size="medium" />
      <SistersStory />
      <SakuraDivider motif="petals" size="medium" />
      <SiteFooter />
      <CartToast />
      <WhatsAppFab phone={whatsappPhone} />
    </>
  );
}
