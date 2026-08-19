import { CartToast } from "@/components/public/CartToast";
import { LandingHero } from "@/components/public/LandingHero";
import { MenuView } from "@/components/public/MenuView";
import { PromoBanner } from "@/components/public/PromoBanner";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SistersStory } from "@/components/public/SistersStory";
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

export function PublicHome({
  categories,
  products,
  whatsappPhone,
  promos,
}: PublicHomeProps) {
  return (
    <>
      <SiteHeader products={products} />
      <LandingHero />
      <PromoBanner promos={promos} />
      <SistersStory />
      <MenuView categories={categories} products={products} />
      <SiteFooter />
      <CartToast />
      <WhatsAppFab phone={whatsappPhone} />
    </>
  );
}
