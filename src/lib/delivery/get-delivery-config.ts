import { DEFAULT_DELIVERY_CONFIG } from "@/lib/delivery/default-config";
import { normalizeDeliveryConfig } from "@/lib/delivery/zones";
import { isServiceRoleKeyConfigured } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { DeliveryConfigSetting } from "@/types/database";

const FALLBACK_DELIVERY = DEFAULT_DELIVERY_CONFIG;

function warnFallback(reason: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[shimai] Using fallback delivery_config: ${reason}`);
  }
}

/** Loads delivery_config server-side — never send kitchen coords to the browser. */
export async function getDeliveryConfigServer(): Promise<DeliveryConfigSetting> {
  if (!isServiceRoleKeyConfigured()) {
    warnFallback(
      "set SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API → service_role)",
    );
    return FALLBACK_DELIVERY;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "delivery_config")
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      warnFallback(error.message);
      return FALLBACK_DELIVERY;
    }
    throw new Error(`Unable to load delivery_config: ${error.message}`);
  }

  return normalizeDeliveryConfig(data?.value) ?? FALLBACK_DELIVERY;
}
