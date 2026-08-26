import Link from "next/link";

import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { shimaiBrand } from "@/lib/brand/shimai";

type SiteFooterProps = {
  hoursDetail?: string;
};

export function SiteFooter({
  hoursDetail = shimaiBrand.operations.hoursDetail,
}: SiteFooterProps) {
  const ops = shimaiBrand.operations;

  return (
    <footer className="border-t border-white/[0.05] bg-shimai-black">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <Link
            href="/"
            aria-label={`${shimaiBrand.name} ${shimaiBrand.tagline}`}
            className="shimai-footer-logo group relative block w-[min(72vw,15rem)] transition-opacity hover:opacity-90 sm:w-[16rem]"
          >
            <div className="relative aspect-[3/2] w-full">
              <div className="shimai-hero-cinema absolute inset-0 flex items-center justify-center">
                <ShimaiLogo
                  variant="heroFull"
                  className="relative h-auto w-auto max-h-full max-w-full object-contain opacity-90"
                />
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 shimai-footer-logo-vignette"
              />
            </div>
          </Link>

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
              {hoursDetail}.
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

        <div className="mt-6 space-y-1.5 text-center font-sans text-[11px] leading-relaxed text-shimai-ivory/30">
          <p>
            © {new Date().getFullYear()} {shimaiBrand.name}. Todos los derechos
            reservados.
          </p>
          <p>
            Creado por{" "}
            <a
              href="https://axius.agency"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shimai-gold underline decoration-shimai-gold/35 underline-offset-2 transition-colors hover:text-shimai-gold/90 hover:decoration-shimai-gold/60"
            >
              Axius Agency
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
