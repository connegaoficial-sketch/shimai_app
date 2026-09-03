import { unstable_cache } from "next/cache";

import { getWhatsAppContact } from "@/lib/contact/get-whatsapp-contact";
import { getMenuData } from "@/lib/menu/get-menu-data";
import { getOrderingStatusFromDb } from "@/lib/ordering/get-ordering-status";
import { getLivePromos } from "@/lib/promos/get-active-promos";
import { getSistersStory } from "@/lib/sisters/get-sisters-story";

/** Home page public data — cached 60s to cut DB load from bots and idle traffic. */
export const getCachedHomePageData = unstable_cache(
  async () => {
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

    return {
      categories,
      products,
      whatsappContact,
      promos,
      orderingStatus,
      sistersStory,
    };
  },
  ["home-page-data"],
  { revalidate: 60, tags: ["home", "menu", "promos", "settings"] },
);
