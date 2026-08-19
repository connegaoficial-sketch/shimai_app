import { DEFAULT_WHATSAPP_CONTACT } from "@/lib/contact/whatsapp";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";
import { DEFAULT_DELIVERY_CONFIG } from "@/lib/delivery/default-config";
import { normalizeDeliveryConfig } from "@/lib/delivery/zones";
import { createClient } from "@/lib/supabase/server";
import type {
  BankDetailsSetting,
  DeliveryConfigSetting,
  PaymentMethodsSetting,
  WhatsAppContactSetting,
} from "@/types/database";
import { DEFAULT_PROMOS, parsePromosSetting } from "@/lib/promos/promos";
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

const DEFAULT_DELIVERY = DEFAULT_DELIVERY_CONFIG;

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "payment_methods",
      "bank_details",
      "delivery_config",
      "whatsapp_contact",
      "promos",
    ]);

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
      whatsappContact={
        (byKey.get("whatsapp_contact") as WhatsAppContactSetting | undefined) ??
        DEFAULT_WHATSAPP_CONTACT
      }
      promos={parsePromosSetting(byKey.get("promos")) ?? DEFAULT_PROMOS}
    />
  );
}
