import { createPublicServerClient } from "@/lib/supabase/public-server";
import {
  DEFAULT_WHATSAPP_CONTACT,
  parseWhatsAppContact,
  type WhatsAppContactSetting,
} from "@/lib/contact/whatsapp";

export async function getWhatsAppContact(): Promise<WhatsAppContactSetting> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "whatsapp_contact")
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[shimai] whatsapp_contact:", error.message);
    }
    return DEFAULT_WHATSAPP_CONTACT;
  }

  return parseWhatsAppContact(data?.value);
}
