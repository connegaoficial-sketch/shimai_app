import { SettingsAdmin } from "@/components/admin/SettingsAdmin";
import { normalizeDeliveryConfig } from "@/lib/delivery/zones";
import { createClient } from "@/lib/supabase/server";
import type {
  BankDetailsSetting,
  DeliveryConfigSetting,
  PaymentMethodsSetting,
} from "@/types/database";

const DEFAULT_PAYMENTS: PaymentMethodsSetting = {
  card_online: true,
  cash: true,
  bank_transfer: true,
  card_terminal: true,
};

const DEFAULT_BANK: BankDetailsSetting = {
  bank_name: "",
  clabe: "",
  account_number: "",
  holder_name: "",
};

const DEFAULT_DELIVERY: DeliveryConfigSetting = {
  kitchen_coordinates: { lat: 19.432608, lng: -99.133209 },
  zones: [
    { radius_km: 1, fee: 30 },
    { radius_km: 2, fee: 60 },
    { radius_km: 3, fee: 90 },
  ],
  max_radius_km: 3,
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["payment_methods", "bank_details", "delivery_config"]);

  if (error) {
    throw new Error(`Failed to load settings: ${error.message}`);
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  return (
    <SettingsAdmin
      paymentMethods={
        (byKey.get("payment_methods") as PaymentMethodsSetting | undefined) ??
        DEFAULT_PAYMENTS
      }
      bankDetails={
        (byKey.get("bank_details") as BankDetailsSetting | undefined) ??
        DEFAULT_BANK
      }
      deliveryConfig={
        normalizeDeliveryConfig(byKey.get("delivery_config")) ??
        DEFAULT_DELIVERY
      }
    />
  );
}
