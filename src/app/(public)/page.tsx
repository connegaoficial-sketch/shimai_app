import { PublicHome } from "@/components/public/PublicHome";
import { getMenuData } from "@/lib/menu/get-menu-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { categories, products } = await getMenuData();

  return <PublicHome categories={categories} products={products} />;
}
