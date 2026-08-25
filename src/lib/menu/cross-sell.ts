import type { MenuCategory, MenuProduct } from "@/lib/menu/get-menu-data";

export type CrossSellGroup = "food" | "drink" | "dessert";

export type CrossSellCartLine = {
  productId: string;
  quantity: number;
};

export type CrossSellResult = {
  products: MenuProduct[];
  /** Short UX hint for the rail subtitle */
  hint: string;
};

const DRINK_RE = /drink|bebida|refresco|sake|soda|té|tea|jugo|agua/;
const DESSERT_RE = /sweet|postre|dessert|sakura|mochi|cake|tart|dulce/;

/** Clasifica un grupo del menú sin hardcodear IDs (slugs/nombres de admin). */
export function classifyMenuGroup(
  category: Pick<MenuCategory, "slug" | "name"> | null | undefined,
): CrossSellGroup {
  if (!category) return "food";
  const haystack = `${category.slug} ${category.name}`.toLowerCase();
  if (DRINK_RE.test(haystack)) return "drink";
  if (DESSERT_RE.test(haystack)) return "dessert";
  return "food";
}

function countCartByGroup(input: {
  products: MenuProduct[];
  categories: MenuCategory[];
  cartLines: CrossSellCartLine[];
}): Record<CrossSellGroup, number> {
  const byId = new Map(input.products.map((p) => [p.id, p]));
  const catById = new Map(input.categories.map((c) => [c.id, c]));
  const counts: Record<CrossSellGroup, number> = {
    food: 0,
    drink: 0,
    dessert: 0,
  };

  for (const line of input.cartLines) {
    const product = byId.get(line.productId);
    if (!product) continue;
    const group = classifyMenuGroup(catById.get(product.category_id));
    counts[group] += Math.max(1, line.quantity);
  }

  return counts;
}

/**
 * Alineación de mesa:
 * - Con sushi/platillos → priorizar bebidas o postres
 * - Con más bebidas que alimentos → priorizar platillos
 * - Con postres dominantes → priorizar bebida o platillo
 */
export function preferredCrossSellGroups(
  counts: Record<CrossSellGroup, number>,
): CrossSellGroup[] {
  const { food, drink, dessert } = counts;
  const total = food + drink + dessert;

  if (total === 0) {
    return ["food", "drink", "dessert"];
  }

  if (drink > food) {
    return ["food", "dessert", "drink"];
  }

  if (dessert > food && dessert >= drink) {
    return ["drink", "food", "dessert"];
  }

  // Tiene platillos (sushi u otros) → completar con bebida/postre
  if (food > 0) {
    if (drink === 0 && dessert === 0) return ["drink", "dessert", "food"];
    if (drink === 0) return ["drink", "dessert", "food"];
    if (dessert === 0) return ["dessert", "drink", "food"];
    return ["drink", "dessert", "food"];
  }

  return ["food", "drink", "dessert"];
}

function hintForGroups(
  preferred: CrossSellGroup[],
  counts: Record<CrossSellGroup, number>,
): string {
  const top = preferred[0];
  if (counts.drink > counts.food) {
    return "¿No sabes qué más? Te falta un platillo para equilibrar la mesa.";
  }
  if (top === "drink") {
    return "¿No sabes qué más? Una bebida de la casa suele ser el siguiente paso.";
  }
  if (top === "dessert") {
    return "¿No sabes qué más? Un postre sakura cierra bien, o suma otra pieza.";
  }
  return "¿No sabes qué más sumar? Te sugerimos algo que combina con lo que ya llevas.";
}

function sortCandidates(a: MenuProduct, b: MenuProduct): number {
  if (a.is_signature !== b.is_signature) {
    return a.is_signature ? -1 : 1;
  }
  return a.sort_order - b.sort_order;
}

/**
 * Hasta 4 sugerencias alineadas por grupo (comida / bebida / postre).
 */
export function getCrossSellProducts(input: {
  products: MenuProduct[];
  categories?: MenuCategory[];
  cartLines?: CrossSellCartLine[];
  /** @deprecated Prefer cartLines; kept for modal “producto actual” */
  preferDifferentCategoryFrom?: string | null;
  excludeIds: string[];
  limit?: number;
}): CrossSellResult {
  const limit = Math.min(input.limit ?? 4, 4);
  const excluded = new Set(input.excludeIds);
  const categories = input.categories ?? [];
  const catById = new Map(categories.map((c) => [c.id, c]));

  const cartLines =
    input.cartLines && input.cartLines.length > 0
      ? input.cartLines
      : input.preferDifferentCategoryFrom
        ? (() => {
            const sample = input.products.find(
              (p) => p.category_id === input.preferDifferentCategoryFrom,
            );
            return sample
              ? [{ productId: sample.id, quantity: 1 }]
              : [];
          })()
        : [];

  const counts = countCartByGroup({
    products: input.products,
    categories,
    cartLines,
  });
  const preferred = preferredCrossSellGroups(counts);
  const hint = hintForGroups(preferred, counts);

  const available = input.products.filter((p) => !excluded.has(p.id));

  const byGroup: Record<CrossSellGroup, MenuProduct[]> = {
    food: [],
    drink: [],
    dessert: [],
  };

  for (const product of available) {
    const group = classifyMenuGroup(catById.get(product.category_id));
    byGroup[group].push(product);
  }

  for (const group of Object.keys(byGroup) as CrossSellGroup[]) {
    byGroup[group].sort(sortCandidates);
  }

  const picked: MenuProduct[] = [];
  const pickedIds = new Set<string>();

  // Round-robin by preferred groups so the rail mixes complements (max 4).
  let guard = 0;
  while (picked.length < limit && guard < limit * preferred.length + 4) {
    guard += 1;
    let added = false;
    for (const group of preferred) {
      if (picked.length >= limit) break;
      const next = byGroup[group].find((p) => !pickedIds.has(p.id));
      if (!next) continue;
      picked.push(next);
      pickedIds.add(next.id);
      added = true;
    }
    if (!added) break;
  }

  // Fallback if categories missing / empty preferred pools
  if (picked.length < limit) {
    const leftovers = available
      .filter((p) => !pickedIds.has(p.id))
      .sort(sortCandidates);
    for (const product of leftovers) {
      if (picked.length >= limit) break;
      picked.push(product);
    }
  }

  return { products: picked, hint };
}
