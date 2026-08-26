import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export async function getShimaiVapidConfig(): Promise<VapidConfig | null> {
  let service;
  try {
    service = createServiceRoleClient();
  } catch {
    return null;
  }

  const { data, error } = await service
    .from("settings")
    .select("value")
    .eq("key", "web_push_vapid")
    .maybeSingle();

  if (error || !data?.value || typeof data.value !== "object") return null;

  const row = data.value as Record<string, unknown>;
  const publicKey = typeof row.public_key === "string" ? row.public_key.trim() : "";
  const privateKey =
    typeof row.private_key === "string" ? row.private_key.trim() : "";
  const subject =
    typeof row.subject === "string" && row.subject.trim()
      ? row.subject.trim()
      : "mailto:hello@shimai.mx";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export async function getShimaiVapidPublicKey(): Promise<string | null> {
  const config = await getShimaiVapidConfig();
  return config?.publicKey ?? null;
}
