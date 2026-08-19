import { createPublicServerClient } from "@/lib/supabase/public-server";
import {
  DEFAULT_PROMOS,
  livePromos,
  parsePromosSetting,
  type Promo,
  type PromosSetting,
} from "@/lib/promos/promos";

export async function getPromosSetting(): Promise<PromosSetting> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "promos")
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[shimai] promos:", error.message);
    }
    return DEFAULT_PROMOS;
  }

  return parsePromosSetting(data?.value);
}

export async function getLivePromos(): Promise<Promo[]> {
  const setting = await getPromosSetting();
  return livePromos(setting);
}
