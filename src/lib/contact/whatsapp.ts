export type WhatsAppContactSetting = {
  phone: string;
};

/** Digits only; prepend MX country code when 10 local digits. */
export function normalizeWhatsAppPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

export function isWhatsAppConfigured(phone: string | null | undefined): boolean {
  return normalizeWhatsAppPhone(phone ?? "").length >= 12;
}

export function buildWhatsAppUrl(
  phone: string,
  message?: string,
): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (normalized.length < 12) return null;

  const base = `https://wa.me/${normalized}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function formatWhatsAppDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.startsWith("52") && digits.length === 12) {
    const local = digits.slice(2);
    return `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return trimmed;
}

export function parseWhatsAppContact(value: unknown): WhatsAppContactSetting {
  if (!value || typeof value !== "object") return { phone: "" };
  const phone = (value as { phone?: unknown }).phone;
  return { phone: typeof phone === "string" ? phone : "" };
}

export const DEFAULT_WHATSAPP_CONTACT: WhatsAppContactSetting = { phone: "" };
