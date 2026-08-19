import { normalizeDeliveryConfig } from "@/lib/delivery/zones";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { DeliveryConfigSetting } from "@/types/database";

const FALLBACK_DELIVERY: DeliveryConfigSetting = {
  kitchen_coordinates: { lat: 19.432608, lng: -99.133209 },
  zones: [
    { radius_km: 1, fee: 30 },
    { radius_km: 2, fee: 60 },
    { radius_km: 3, fee: 90 },
  ],
  max_radius_km: 3,
};

/** Loads delivery_config server-side — never send kitchen coords to the browser. */
export async function getDeliveryConfigServer(): Promise<DeliveryConfigSetting> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "delivery_config")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load delivery_config: ${error.message}`);
  }

  return normalizeDeliveryConfig(data?.value) ?? FALLBACK_DELIVERY;
}
