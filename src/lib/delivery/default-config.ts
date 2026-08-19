import type { DeliveryConfigSetting } from "@/types/database";

/** Rioverde, SLP — default Dark Kitchen coverage until admin overrides. */
export const DEFAULT_DELIVERY_CONFIG: DeliveryConfigSetting = {
  kitchen_coordinates: { lat: 21.9312, lng: -99.9966 },
  zones: [
    { radius_km: 3, fee: 30 },
    { radius_km: 6, fee: 60 },
    { radius_km: 10, fee: 90 },
  ],
  max_radius_km: 10,
};
