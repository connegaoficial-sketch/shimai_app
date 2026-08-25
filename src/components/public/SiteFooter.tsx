import Link from "next/link";

import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { shimaiBrand } from "@/lib/brand/shimai";

export function SiteFooter() {
  const ops = shimaiBrand.operations;

  return (
    <footer className="border-t border-white/[0.05] bg-shimai-black">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-8 text-center">
          <Link
            href="/"
            className="block h-16 w-16 transition-opacity hover:opacity-80"
          >
            <ShimaiLogo variant="emblem" className="h-16 w-16" />
          </Link>

          <div className="space-y-1">
            <p className="font-serif text-lg tracking-wide text-shimai-ivory">
              {shimaiBrand.name}
            </p>
            <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-shimai-gold/70">
              {shimaiBrand.tagline}
            </p>
          </div>

          <p className="max-w-sm font-sans text-sm leading-relaxed text-shimai-ivory/50">
            {shimaiBrand.motto}
          </p>
          <p className="max-w-sm font-sans text-xs leading-relaxed text-shimai-ivory/35">
            {shimaiBrand.undecidedLead}
          </p>
        </div>

        <div className="mt-12 grid gap-8 border-t border-white/[0.06] pt-10 text-left sm:grid-cols-3">
          <div>
            <h2 className="font-serif text-lg text-shimai-ivory">Entrega</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-shimai-ivory/50">
              {ops.zonesDetail}. {ops.deliveryDetail}: {ops.deliveryEstimate}.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-lg text-shimai-ivory">Horario</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-shimai-ivory/50">
              {ops.hoursDetail}.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-lg text-shimai-ivory">Pagos</h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-shimai-ivory/50">
              {ops.payments.join(", ")}. Pagas como te acomode.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center font-sans text-xs text-shimai-ivory/35">
          Dark kitchen · Pedido online · Entrega a domicilio
        </p>
      </div>
    </footer>
  );
}
