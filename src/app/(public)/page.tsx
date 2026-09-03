import { PublicHome } from "@/components/public/PublicHome";
import { getCachedHomePageData } from "@/lib/public/get-cached-home-page-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    categories,
    products,
    whatsappContact,
    promos,
    orderingStatus,
    sistersStory,
  } = await getCachedHomePageData();

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
