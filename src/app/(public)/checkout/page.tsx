import Link from "next/link";

import { CheckoutClient } from "@/components/public/CheckoutClient";
import { getMenuData } from "@/lib/menu/get-menu-data";
import { getLivePromos } from "@/lib/promos/get-active-promos";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethodsSetting } from "@/types";

export const dynamic = "force-dynamic";

const DEFAULT_PAYMENT_METHODS: PaymentMethodsSetting = {
  card_online: true,
  cash: true,
  bank_transfer: true,
  card_terminal: true,
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { url: supabaseUrl, key: anonKey } = getSupabasePublicEnv();

  const [{ data: paymentRow }, authResult, livePromos, menu] = await Promise.all([
    supabase
      .from("settings")
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle(),
    supabase.auth.getUser(),
    getLivePromos(),
    getMenuData(),
  ]);

  const paymentMethods =
    (paymentRow?.value as PaymentMethodsSetting | null) ??
    DEFAULT_PAYMENT_METHODS;

  let prefill: { fullName?: string | null; phone?: string | null } = {};
  const user = authResult.data.user;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    prefill = {
      fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      phone: profile?.phone ?? user.phone ?? null,
    };
  }

  return (
    <main className="min-h-full bg-shimai-black">
      <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl tracking-wide text-shimai-ivory"
        >
          SHIMAI
        </Link>
      </div>
      <CheckoutClient
        paymentMethods={paymentMethods}
        supabaseUrl={supabaseUrl}
        anonKey={anonKey}
        products={menu.products}
        prefill={prefill}
        promos={livePromos}
      />
    </main>
  );
}
