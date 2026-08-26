import { PublicHome } from "@/components/public/PublicHome";
import { getWhatsAppContact } from "@/lib/contact/get-whatsapp-contact";
import { getMenuData } from "@/lib/menu/get-menu-data";
import { getOrderingStatusFromDb } from "@/lib/ordering/get-ordering-status";
import { getLivePromos } from "@/lib/promos/get-active-promos";
import { getSistersStory } from "@/lib/sisters/get-sisters-story";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    { categories, products },
    whatsappContact,
    promos,
    orderingStatus,
    sistersStory,
  ] = await Promise.all([
    getMenuData(),
    getWhatsAppContact(),
    getLivePromos(),
    getOrderingStatusFromDb(),
    getSistersStory(),
  ]);

  return (
    <PublicHome
      categories={categories}
      products={products}
      whatsappPhone={whatsappContact.phone}
      promos={promos}
      orderingStatus={orderingStatus}
      sistersStory={sistersStory}
    />
  );
}
