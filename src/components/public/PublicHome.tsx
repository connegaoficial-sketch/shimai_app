import { CartToast } from "@/components/public/CartToast";
import { LandingHero } from "@/components/public/LandingHero";
import { MenuView } from "@/components/public/MenuView";
import { OrderingClosedBanner } from "@/components/public/OrderingClosedBanner";
import { OrderingGateProvider } from "@/components/public/OrderingGate";
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
import type { OrderingStatus } from "@/lib/ordering/schedule";
import type { Promo } from "@/lib/promos/promos";
import type { SistersStorySetting } from "@/lib/sisters/sisters";

type PublicHomeProps = {
  categories: MenuCategory[];
  products: MenuProduct[];
  whatsappPhone: string;
  promos: Promo[];
  orderingStatus: OrderingStatus;
  sistersStory: SistersStorySetting;
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
  orderingStatus,
  sistersStory,
}: PublicHomeProps) {
  return (
    <OrderingGateProvider status={orderingStatus}>
      <SiteHeader products={products} categories={categories} />
      <OrderingClosedBanner />
      <LandingHero />
      <SakuraDivider motif="petals" size="medium" />
      <TrustStrip hoursDetail={orderingStatus.hoursDetail} />
      <PromoBanner promos={promos} />
      <SakuraDivider motif="branches" size="large" />
      <MenuView categories={categories} products={products} promos={promos} />
      <SakuraDivider motif="branches" size="large" />
      <OrderPath />
      <SakuraDivider motif="petals" size="medium" />
      <SistersStory story={sistersStory} />
      <SakuraDivider motif="petals" size="medium" />
      <SiteFooter hoursDetail={orderingStatus.hoursDetail} />
      <CartToast />
      <WhatsAppFab phone={whatsappPhone} />
    </OrderingGateProvider>
  );
}
