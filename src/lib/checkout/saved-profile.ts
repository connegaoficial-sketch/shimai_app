import { isInMexicoBounds } from "@/lib/delivery/mexico-bounds";

const STORAGE_KEY = "shimai_saved_checkout_v1";

export type SavedCheckoutProfile = {
  fullName: string;
  phone: string;
  addressText: string;
  streetNumber: string;
  deliveryLat: number;
  deliveryLng: number;
  references: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseSaved(raw: unknown): SavedCheckoutProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const fullName = isNonEmptyString(row.fullName) ? row.fullName.trim() : "";
  const phone = isNonEmptyString(row.phone) ? row.phone.trim() : "";
  const addressText = isNonEmptyString(row.addressText)
    ? row.addressText.trim()
    : "";
  const streetNumber =
    typeof row.streetNumber === "string" ? row.streetNumber.trim() : "";
  const references =
    typeof row.references === "string" ? row.references.trim() : "";
  const deliveryLat = Number(row.deliveryLat);
  const deliveryLng = Number(row.deliveryLng);

  if (
    !fullName ||
    !phone ||
    !addressText ||
    !Number.isFinite(deliveryLat) ||
    !Number.isFinite(deliveryLng) ||
    !isInMexicoBounds(deliveryLat, deliveryLng)
  ) {
    return null;
  }

  return {
    fullName,
    phone,
    addressText,
    streetNumber,
    deliveryLat,
    deliveryLng,
    references,
  };
}

export function readSavedCheckoutProfile(): SavedCheckoutProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseSaved(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeSavedCheckoutProfile(profile: SavedCheckoutProfile): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearSavedCheckoutProfile(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
}

export function hasSavedCheckoutProfile(): boolean {
  return readSavedCheckoutProfile() != null;
}
