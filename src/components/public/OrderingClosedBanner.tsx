"use client";

import { useOrderingGate } from "@/components/public/OrderingGate";

export function OrderingClosedBanner() {
  const { acceptingOrders, headline, body } = useOrderingGate();
  if (acceptingOrders) return null;

  return (
    <div
      role="status"
      className="bg-shimai-sakura/[0.08]"
    >
      <div className="mx-auto max-w-6xl px-4 py-4 text-center sm:px-6 sm:py-5">
        <p className="font-serif text-xl tracking-tight text-shimai-ivory sm:text-2xl">
          {headline}
        </p>
        <p className="mx-auto mt-1.5 max-w-lg font-sans text-sm leading-relaxed text-shimai-ivory/60">
          {body}
        </p>
      </div>
    </div>
  );
}
