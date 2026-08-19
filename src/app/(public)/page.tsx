import { PublicHome } from "@/components/public/PublicHome";
import { getWhatsAppContact } from "@/lib/contact/get-whatsapp-contact";
import { getMenuData } from "@/lib/menu/get-menu-data";
import { getLivePromos } from "@/lib/promos/get-active-promos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ categories, products }, whatsappContact, promos] = await Promise.all([
    getMenuData(),
    getWhatsAppContact(),
    getLivePromos(),
  ]);

  return (
    <PublicHome
      categories={categories}
      products={products}
      whatsappPhone={whatsappContact.phone}
      promos={promos}
    />
  );
}
