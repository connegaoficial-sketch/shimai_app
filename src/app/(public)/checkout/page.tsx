import Link from "next/link";

import { CheckoutClient } from "@/components/public/CheckoutClient";
import { SakuraDivider } from "@/components/public/SakuraDivider";
import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { getMenuData } from "@/lib/menu/get-menu-data";
import { getOrderingStatusFromDb } from "@/lib/ordering/get-ordering-status";
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

function CheckoutBrandLink() {
  return (
    <Link
      href="/"
      aria-label="SHIMAI — volver al inicio"
      className="relative block h-[6.5625rem] w-[min(95vw,18.125rem)] transition-opacity hover:opacity-90 sm:h-[7.1875rem] sm:w-[20rem]"
    >
      <div className="relative h-full w-full">
        <div className="shimai-hero-cinema absolute inset-0 flex items-center justify-center">
          <ShimaiLogo
            variant="heroFull"
            priority
            className="relative h-auto max-h-full w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </Link>
  );
}

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { url: supabaseUrl, key: anonKey } = getSupabasePublicEnv();

  const [
    { data: paymentRow },
    authResult,
    livePromos,
    menu,
    orderingStatus,
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle(),
    supabase.auth.getUser(),
    getLivePromos(),
    getMenuData(),
    getOrderingStatusFromDb(),
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

  if (!orderingStatus.acceptingOrders) {
    return (
      <main className="min-h-dvh bg-shimai-black">
        <div className="flex justify-center px-4 pb-0 pt-0 sm:justify-start sm:px-6">
          <CheckoutBrandLink />
        </div>
        <SakuraDivider
          motif="branches"
          size="large"
          className="-mt-3 -mb-5 sm:-mt-4 sm:-mb-7"
        />
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 pt-2 pb-20 text-center sm:px-6">
          <p className="font-serif text-3xl tracking-tight text-shimai-ivory">
            {orderingStatus.headline}
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-shimai-ivory/55">
            {orderingStatus.body}
          </p>
          <Link
            href="/#menu"
            className="mt-8 font-sans text-sm text-shimai-gold underline decoration-shimai-gold/35 underline-offset-4 transition-colors hover:text-shimai-gold/90"
          >
            Ver la carta
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-shimai-black">
      <div className="flex justify-center px-4 pb-0 pt-0 sm:justify-start sm:px-6">
        <CheckoutBrandLink />
      </div>
      <SakuraDivider
        motif="branches"
        size="large"
        className="-mt-3 -mb-5 sm:-mt-4 sm:-mb-7"
      />
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
